import { Router } from 'express'
import { protect } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { authLimiter, reviewLimiter } from '../middleware/rateLimit.js'
import * as auth from '../controllers/authController.js'
import * as reviews from '../controllers/reviewController.js'
import * as users from '../controllers/userController.js'
import { getStats } from '../controllers/dashboardController.js'

const router = Router()

router.post('/auth/register', authLimiter, validate(auth.registerSchema), auth.register)
router.post('/auth/login', authLimiter, validate(auth.loginSchema), auth.login)
router.get('/auth/me', protect, auth.me)

router.post('/reviews', protect, reviewLimiter, validate(reviews.createReviewSchema), reviews.createReview)
router.get('/reviews', protect, validate(reviews.listReviewsSchema, 'query'), reviews.listReviews)
router.get('/reviews/:id', protect, reviews.getReview)
router.delete('/reviews/:id', protect, reviews.deleteReview)

router.get('/dashboard/stats', protect, getStats)

router.get('/users/profile', protect, users.getProfile)
router.put('/users/profile', protect, validate(users.updateProfileSchema), users.updateProfile)

export default router
