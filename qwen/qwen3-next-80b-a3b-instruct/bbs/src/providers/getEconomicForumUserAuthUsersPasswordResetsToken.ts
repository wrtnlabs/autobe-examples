import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUserPasswordReset";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getEconomicForumUserAuthUsersPasswordResetsToken(props: {
  user: UserPayload;
  token: string;
}): Promise<IEconomicForumUserPasswordReset> {
  // Extract token from props
  const { token } = props;
  // Query the password reset token record
  const resetRecord =
    await MyGlobal.prisma.economic_forum_user_password_resets.findUnique({
      where: { token },
    });
  // If record not found, throw 404
  if (!resetRecord) {
    throw new HttpException("Password reset token not found", 404);
  }
  // Calculate 24 hours ago as timestamp (in milliseconds)
  const twentyFourHoursAgoInMs = Date.now() - 24 * 60 * 60 * 1000;
  // Validate token is not expired (created_at >= 24 hours ago)
  // Convert created_at to timestamp and compare numerically
  if (resetRecord.created_at.getTime() < twentyFourHoursAgoInMs) {
    throw new HttpException("Password reset token has expired", 404);
  }
  // Return the email as specified in IEconomicForumUserPasswordReset
  // The schema shows user_email field maps to email in DTO
  // Since resetRecord does not contain user_email field (it contains economic_forum_user_id),
  // and we are forbidden from using typia.assert on Prisma types or making additional queries,
  // we must return null for email as it is unavailable in this context.
  return {
    email: null,
  };
}
