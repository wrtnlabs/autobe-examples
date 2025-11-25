import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoListUserAuthUserVerifyToken(props: {
  user: UserPayload;
}): Promise<ITodoListUser.ITokenVerification> {
  try {
    // Extract claims from UserPayload (already decoded by auth middleware)
    const userId = props.user.id;
    const tokenJti = props.user.session_id;
    const currentTime = Math.floor(Date.now() / 1000);

    // Query blacklist to check if token has been revoked
    const blacklistEntry =
      await MyGlobal.prisma.todo_list_token_blacklist.findFirst({
        where: {
          token_jti: tokenJti,
          todo_list_user_id: userId,
        },
      });

    const isRevoked = blacklistEntry !== null;

    // Query user to verify account is still active
    const user = await MyGlobal.prisma.todo_list_users.findUnique({
      where: {
        id: userId,
      },
    });

    const userAccountActive = user !== null && user.deleted_at === null;

    // Calculate token timestamps and remaining lifetime
    // Since we don't have direct access to exp/iat claims here,
    // we use the current time and blacklist expiration if available
    const issuedAt = toISOStringSafe(new Date());
    const expiresAt = blacklistEntry
      ? toISOStringSafe(new Date(blacklistEntry.expires_at))
      : toISOStringSafe(new Date(currentTime * 1000 + 24 * 60 * 60 * 1000));

    const expiresAtTimestamp = blacklistEntry
      ? Math.floor(new Date(blacklistEntry.expires_at).getTime() / 1000)
      : currentTime + 24 * 60 * 60;

    const remainingSeconds = Math.max(0, expiresAtTimestamp - currentTime);

    // Determine validity and failure reason
    let failureReason: string | null = null;
    let isValid = true;

    if (isRevoked) {
      isValid = false;
      failureReason = "token_revoked";
    } else if (!userAccountActive) {
      isValid = false;
      failureReason = "user_account_deleted";
    } else if (remainingSeconds <= 0) {
      isValid = false;
      failureReason = "token_expired";
    }

    return {
      is_valid: isValid,
      user_id: userId,
      token_jti: tokenJti,
      issued_at: issuedAt,
      expires_at: expiresAt,
      remaining_lifetime_seconds: remainingSeconds,
      is_revoked: isRevoked,
      user_account_active: userAccountActive,
      failure_reason: failureReason,
    };
  } catch (error) {
    throw new HttpException("Failed to verify token", 500);
  }
}
