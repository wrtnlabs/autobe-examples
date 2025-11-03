import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postAuthModeratorRefresh(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardModerator.IRefresh;
}): Promise<IDiscussionBoardModerator.IAuthorized> {
  const { moderator, body } = props;

  // Determine target ids based on variant
  let targetModeratorId: string & tags.Format<"uuid">;
  let targetSessionId: string & tags.Format<"uuid">;

  if (body.type === "refresh_token") {
    let decoded: { id: string; session_id: string; type: string };
    try {
      decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
        issuer: "autobe",
      }) as { id: string; session_id: string; type: string };
    } catch (err) {
      throw new HttpException("Invalid or expired refresh token", 401);
    }

    if (decoded.type !== "moderator") {
      throw new HttpException("Invalid token type", 403);
    }

    targetModeratorId = decoded.id as unknown as string & tags.Format<"uuid">;
    targetSessionId = decoded.session_id as unknown as string &
      tags.Format<"uuid">;
  } else {
    // session_id variant
    targetSessionId = body.session_id;
    targetModeratorId = moderator.id;
  }

  // Fetch session
  const session =
    await MyGlobal.prisma.discussion_board_moderator_sessions.findFirst({
      where: {
        id: targetSessionId,
        discussion_board_moderator_id: targetModeratorId,
      },
    });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // Validate session expiry
  if (session.expired_at && session.expired_at.getTime() <= Date.now()) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // Fetch moderator and validate
  const mod =
    await MyGlobal.prisma.discussion_board_moderator.findUniqueOrThrow({
      where: { id: targetModeratorId },
    });

  if (mod.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  // If authenticated moderator provided, ensure ownership
  if (moderator && moderator.id !== targetModeratorId) {
    throw new HttpException(
      "Unauthorized: session does not belong to actor",
      403,
    );
  }

  // Prepare timestamps
  const now = new Date();
  const nowIso = toISOStringSafe(now);
  const accessExpireDate = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpireDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessExpiredAt = toISOStringSafe(accessExpireDate);
  const refreshableUntil = toISOStringSafe(refreshExpireDate);

  // Sign tokens
  const access = jwt.sign(
    {
      type: "moderator",
      id: targetModeratorId,
      session_id: targetSessionId,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refresh = jwt.sign(
    {
      type: "moderator",
      id: targetModeratorId,
      session_id: targetSessionId,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Update session expiry (sliding window)
  await MyGlobal.prisma.discussion_board_moderator_sessions.update({
    where: { id: targetSessionId },
    data: {
      expired_at: refreshExpireDate,
    },
  });

  // Create audit entry
  await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      event_type: "auth.moderator.refresh",
      event_timestamp: nowIso,
      resource_type: null,
      resource_id: null,
      actor_type: "moderator",
      actor_id: targetModeratorId,
      ip: session.ip ?? null,
      user_agent: session.href ?? null,
      metadata: JSON.stringify({ session_id: targetSessionId }),
      created_at: nowIso,
      updated_at: nowIso,
    },
  });

  // Build response object
  const response: IDiscussionBoardModerator.IAuthorized = {
    id: mod.id,
    username: mod.username,
    email: mod.email ?? undefined,
    display_name: mod.display_name ?? null,
    created_at: toISOStringSafe(mod.created_at),
    updated_at: toISOStringSafe(mod.updated_at),
    token: {
      access,
      refresh,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
    moderator: {
      id: mod.id,
      username: mod.username,
      display_name: mod.display_name ?? null,
      created_at: toISOStringSafe(mod.created_at),
      updated_at: toISOStringSafe(mod.updated_at),
      deleted_at: mod.deleted_at ? toISOStringSafe(mod.deleted_at) : null,
    },
  };

  return response;
}
