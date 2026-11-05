import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

userSchema.methods.toSafeJSON = function () {
  return { id: this._id, name: this.name, email: this.email, createdAt: this.createdAt }
}

export const User = mongoose.model('User', userSchema)
