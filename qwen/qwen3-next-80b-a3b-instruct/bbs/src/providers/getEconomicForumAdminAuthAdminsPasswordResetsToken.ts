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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getEconomicForumAdminAuthAdminsPasswordResetsToken(props: {
  admin: AdminPayload;
  token: string;
}): Promise<void> {
  const reset =
    await MyGlobal.prisma.economic_forum_admin_password_resets.findUnique({
      where: { token: props.token },
    });
  if (!reset) {
    throw new HttpException("Invalid or expired password reset token", 404);
  }
  // Get current timestamp as string & tags.Format<'date-time'>
  const now = toISOStringSafe(new Date());
  // Calculate expiration: created_at + 60 minutes (1 hour)
  // Parse created_at to Date, add 60 minutes, convert back to string
  const createdDate = new Date(reset.created_at);
  const expiryDate = new Date(createdDate.getTime() + 60 * 60 * 1000);
  const expiryString = toISOStringSafe(expiryDate);
  // Compare using string comparison (ISO 8601 strings are lexicographically comparable)
  if (now >= expiryString) {
    throw new HttpException("Invalid or expired password reset token", 404);
  }
  // Check if token already used
  if (reset.used !== false) {
    throw new HttpException("Invalid or expired password reset token", 404);
  }
  // Mark token as used with current timestamp
  await MyGlobal.prisma.economic_forum_admin_password_resets.update({
    where: { token: props.token },
    data: { used: true },
  });
}
