import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchCommunityPlatformModeratorPassword(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformModerator.IChangePassword;
}): Promise<void> {
  // Find the moderator
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        id: props.moderator.id,
        deleted_at: null,
        is_active: true,
      },
    });
  if (moderator === null) {
    throw new HttpException("Unauthorized", 401);
  }
  // Verify current password using bcrypt
  const bcrypt = require("bcrypt");
  const currentPasswordValid = await bcrypt.compare(
    props.body.current_password,
    moderator.password_hash,
  );
  if (!currentPasswordValid) {
    throw new HttpException("Current password is incorrect", 400);
  }
  // Validate new password meets complexity requirements
  if (props.body.new_password.length < 8) {
    throw new HttpException(
      "New password must be at least 8 characters long",
      400,
    );
  }
  // Additional password complexity validation
  const hasUpperCase = /[A-Z]/.test(props.body.new_password);
  const hasLowerCase = /[a-z]/.test(props.body.new_password);
  const hasNumbers = /\d/.test(props.body.new_password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(props.body.new_password);
  if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
    throw new HttpException(
      "New password must contain uppercase, lowercase, numbers, and special characters",
      400,
    );
  }
  // Hash and update password using bcrypt
  const saltRounds = 12;
  const newPasswordHash = await bcrypt.hash(
    props.body.new_password,
    saltRounds,
  );
  try {
    await MyGlobal.prisma.community_platform_moderators.update({
      where: {
        id: moderator.id,
      },
      data: {
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    throw new HttpException("Failed to update password", 500);
  }
  // Delete all moderator sessions
  try {
    await MyGlobal.prisma.community_platform_moderator_sessions.deleteMany({
      where: {
        community_platform_moderator_id: moderator.id,
      },
    });
  } catch (error) {
    // Log error but don't prevent password change
  }
}
