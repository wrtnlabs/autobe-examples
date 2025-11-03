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

export async function postAuthModeratorLogin(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardModerator.ILogin;
}): Promise<IDiscussionBoardModerator.IAuthorized> {
  const { body, moderator: invokingModerator } = props;

  // 1. Find moderator by username OR email
  const found = await MyGlobal.prisma.discussion_board_moderator.findFirst({
    where: {
      OR: [{ username: body.usernameOrEmail }, { email: body.usernameOrEmail }],
    },
  });

  if (!found) {
    // Generic message to avoid user enumeration
    throw new HttpException("Invalid credentials", 401);
  }

  // 2. Check soft-deleted / suspended
  if (found.deleted_at) {
    throw new HttpException("Account suspended or deleted", 403);
  }

  // 3. Verify password
  const isValid = await PasswordUtil.verify(body.password, found.password_hash);
  if (!isValid) {
    // Record failed login attempt for audit
    try {
      await MyGlobal.prisma.discussion_board_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          event_type: "auth.moderator.login_failed",
          event_timestamp: toISOStringSafe(new Date()),
          actor_type: "moderator",
          actor_id: found.id,
          ip: body.ip ?? null,
          user_agent: null,
          metadata: JSON.stringify({ usernameOrEmail: body.usernameOrEmail }),
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
          deleted_at: null,
        },
      });
    } catch (_e) {
      // swallow audit errors
    }

    throw new HttpException("Invalid credentials", 401);
  }

  // 4. Create session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const nowIso = toISOStringSafe(new Date());

  const session =
    await MyGlobal.prisma.discussion_board_moderator_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_moderator_id: found.id,
        ip: body.ip ?? "",
        href: body.href,
        referrer: body.referrer,
        created_at: nowIso,
        expired_at: toISOStringSafe(accessExpires),
      },
    });

  // 5. Create audit log for successful login (best-effort)
  try {
    await MyGlobal.prisma.discussion_board_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        event_type: "auth.moderator.login",
        event_timestamp: nowIso,
        actor_type: "moderator",
        actor_id: found.id,
        ip: body.ip ?? null,
        user_agent: null,
        metadata: JSON.stringify({ session_id: session.id }),
        created_at: nowIso,
        updated_at: nowIso,
        deleted_at: null,
      },
    });
  } catch (_e) {
    // ignore audit errors
  }

  // 6. Generate tokens
  const accessToken = jwt.sign(
    {
      type: "moderator",
      id: found.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    {
      type: "moderator",
      id: found.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // 7. Build return object
  const result = {
    id: found.id,
    username: found.username,
    email: found.email ?? undefined,
    display_name: found.display_name ?? null,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
    moderator: {
      id: found.id,
      username: found.username,
      display_name: found.display_name ?? null,
      created_at: toISOStringSafe(found.created_at),
      updated_at: toISOStringSafe(found.updated_at),
      deleted_at: found.deleted_at ? toISOStringSafe(found.deleted_at) : null,
    },
  } satisfies IDiscussionBoardModerator.IAuthorized;

  return result;
}
