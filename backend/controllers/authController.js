import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { User } from '../models/User.js'
import { signToken } from '../middleware/auth.js'
import { AppError } from '../utils/AppError.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters') // bcrypt truncates beyond 72 bytes
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number')

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: passwordRule,
})
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required').max(200),
})

export const SALT_ROUNDS = 12

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body
  if (await User.exists({ email })) throw new AppError('An account with this email already exists', 409)
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  const user = await User.create({ name, email, passwordHash })
  res.status(201).json({ status: 'success', token: signToken(user._id), user: user.toSafeJSON() })
})

// Compare against a dummy hash when the user is missing so timing does not reveal valid emails
const DUMMY_HASH = bcrypt.hashSync('dummy-password-1', SALT_ROUNDS)

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ email }).select('+passwordHash')
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH)
  if (!user || !ok) throw new AppError('Invalid email or password', 401)
  res.json({ status: 'success', token: signToken(user._id), user: user.toSafeJSON() })
})

export const me = (req, res) => res.json({ status: 'success', user: req.user.toSafeJSON() })
