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

export async function postEconomicForumUserAuthUsersPasswordResets(props: {
  user: UserPayload;
  body: IEconomicForumUserPasswordReset;
}): Promise<void> {
  // 2. Lookup user by email
  const user = await MyGlobal.prisma.economic_forum_users.findUnique({
    where: { email: props.body.email },
  });
  if (!user) {
    throw new HttpException("User with this email not found", 404);
  }
  // 3. Check rate limit: 3 requests per hour per email
  const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
  const recentResets =
    await MyGlobal.prisma.economic_forum_user_password_resets.count({
      where: {
        economic_forum_user_id: user.id,
        created_at: { gte: toISOStringSafe(oneHourAgo) },
        expired_at: undefined,
      },
    });
  if (recentResets >= 3) {
    throw new HttpException(
      "Too many password reset requests. Please try again later.",
      429,
    );
  }
  // 4. Generate 64-character secure token (not UUID). Use crypto module to generate 64-char base64url.
  const tokenBytes = new Uint8Array(48); // 48 * 8 = 384 bits = 64 chars base64url
  crypto.getRandomValues(tokenBytes);
  const token = btoa(String.fromCharCode(...tokenBytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  // 5. Calculate expires_at as ISO string (24 hours from now)
  const expiresAt = toISOStringSafe(new Date(Date.now() + 24 * 60 * 60 * 1000));
  // 6. Create password reset record
  await MyGlobal.prisma.economic_forum_user_password_resets.create({
    data: {
      id: token,
      token: token,
      economic_forum_user_id: user.id,
      expired_at: expiresAt,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // 7. Create audit entry
  await MyGlobal.prisma.economic_forum_system_audits.create({
    data: {
      action: "PASSWORD_RESET_REQUESTED",
      actorId: user.id,
      actor_role: "user",
      target_id: user.id,
      target_type: "user",
      details: JSON.stringify({ email: props.body.email }),
      created_at: toISOStringSafe(new Date()),
    },
  });
  // 8. Send email notification to user (implementation not shown - would be async background job)
  // sendPasswordResetEmail(user.email, token);
  // 9. Return 204 No Content
  return;
}
