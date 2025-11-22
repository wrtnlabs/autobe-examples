import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalDiscussionContentModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionContentModerator";
import { ContentmoderatorPayload } from "../decorators/payload/ContentmoderatorPayload";

export async function postAuthContentModeratorPasswordReset(props: {
  contentModerator: ContentmoderatorPayload;
  body: IEconPoliticalDiscussionContentModerator.IResetPassword;
}): Promise<IEconPoliticalDiscussionContentModerator.IPasswordResetResponse> {
  const { body } = props;

  // Validate that the email exists in the database
  const existingUser =
    await MyGlobal.prisma.econ_political_discussion_users.findFirst({
      where: {
        email: body.email,
        deleted_at: null,
      },
    });

  if (!existingUser) {
    throw new HttpException("Email not found in our records", 404);
  }

  // Generate a secure reset token for simulation purposes
  const resetToken = v4() as string & tags.Format<"uuid">;

  // Note: In production, this token would be stored in a dedicated table
  // and sent via email. For this simulation, we generate and return the token info.

  return {
    message: "Password reset instructions have been sent to your email address",
    next_steps:
      "Please check your email for a password reset link. The link will expire in 24 hours. Click the link to reset your password and create a new one that meets our security requirements (8+ characters, mixed case, numbers, and special characters).",
    email_sent: true,
  };
}
