import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";

export async function postAuthAdministratorPasswordReset(props: {
  body: IEconPoliticalForumAdministrator.IRequestPasswordReset;
}): Promise<IEconPoliticalForumAdministrator.IResetRequestResponse> {
  const { body } = props;
  const { email } = body;

  const genericMessage =
    "If an account exists for the provided email, a reset link has been sent.";

  // Use fixed sensible defaults rather than assuming an env field exists
  const RATE_LIMIT_THRESHOLD = 5; // max attempts per window
  const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
  const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

  try {
    const user =
      await MyGlobal.prisma.econ_political_forum_registereduser.findFirst({
        where: { email },
      });

    const now = toISOStringSafe(new Date());

    if (user) {
      const windowStart = toISOStringSafe(
        new Date(Date.now() - RATE_LIMIT_WINDOW_MS),
      );

      const recentForUser =
        await MyGlobal.prisma.econ_political_forum_password_resets.count({
          where: {
            registereduser_id: user.id,
            created_at: { gte: windowStart },
          },
        });

      if (recentForUser >= RATE_LIMIT_THRESHOLD) {
        throw new HttpException("Too Many Requests", 429);
      }
    }

    // Create an audit log regardless of user existence for traceability
    await MyGlobal.prisma.econ_political_forum_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        registereduser_id: user ? user.id : null,
        action_type: "password_reset_requested",
        target_type: "user",
        target_identifier: email,
        details: user
          ? `Password reset requested for registereduser_id=${user.id}`
          : "Password reset requested for unknown email",
        created_at: now,
        created_by_system: true,
      },
    });

    const requestId = v4() as string & tags.Format<"uuid">;

    if (!user) {
      return { success: true, message: genericMessage, request_id: requestId };
    }

    const tokenPlain = v4() + "-" + v4();
    const tokenHash = await PasswordUtil.hash(tokenPlain);
    const expiresAt = toISOStringSafe(new Date(Date.now() + TOKEN_TTL_MS));

    await MyGlobal.prisma.econ_political_forum_password_resets.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        registereduser_id: user.id,
        reset_token_hash: tokenHash,
        expires_at: expiresAt,
        used: false,
        created_at: now,
      },
    });

    // Mail sending should be handled by background worker or mailer integration.
    // Enqueueing is left to application-specific infrastructure.

    return { success: true, message: genericMessage, request_id: requestId };
  } catch (err) {
    if (err instanceof HttpException) throw err;
    throw new HttpException("Internal Server Error", 500);
  }
}
