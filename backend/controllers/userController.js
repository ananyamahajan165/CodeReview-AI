import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { User } from '../models/User.js'
import { Review } from '../models/Review.js'
import { AppError } from '../utils/AppError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { passwordRule, SALT_ROUNDS } from './authController.js'

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(60).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    currentPassword: z.string().max(200).optional(),
    newPassword: passwordRule.optional(),
  })
  .refine((d) => !d.newPassword || d.currentPassword, {
    message: 'Current password is required to set a new password',
    path: ['currentPassword'],
  })

export const getProfile = asyncHandler(async (req, res) => {
  const reviewCount = await Review.countDocuments({ userId: req.user._id })
  res.json({ status: 'success', user: { ...req.user.toSafeJSON(), reviewCount } })
})

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, currentPassword, newPassword } = req.body
  const user = await User.findById(req.user._id).select('+passwordHash')

  if (email && email !== user.email) {
    if (await User.exists({ email, _id: { $ne: user._id } })) throw new AppError('That email is already in use', 409)
    user.email = email
  }
  if (name) user.name = name
  if (newPassword) {
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) throw new AppError('Current password is incorrect', 400)
    user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS)
  }
  await user.save()
  res.json({ status: 'success', user: user.toSafeJSON() })
})
