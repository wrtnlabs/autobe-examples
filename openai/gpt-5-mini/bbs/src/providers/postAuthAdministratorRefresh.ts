import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function postAuthAdministratorRefresh(props: {
  body: IEconPoliticalForumAdministrator.IRefresh;
}): Promise<IEconPoliticalForumAdministrator.IAuthorized> {
  const { body } = props;
  const refreshToken = body.refresh_token;

  if (!refreshToken) {
    throw new HttpException("Bad Request: refresh_token is required", 400);
  }

  let decoded: any;
  try {
    decoded = jwt.verify(refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (err) {
    throw new HttpException("Unauthorized: invalid refresh token", 401);
  }

  // Determine session lookup key
  const sessionToken =
    (decoded && (decoded.session_token ?? decoded.sid ?? decoded.sessionId)) ||
    null;

  // Find session
  const session = sessionToken
    ? await MyGlobal.prisma.econ_political_forum_sessions.findFirst({
        where: { session_token: sessionToken, deleted_at: null },
      })
    : await MyGlobal.prisma.econ_political_forum_sessions.findFirst({
        where: {
          registereduser_id: decoded.registereduser_id ?? decoded.id ?? null,
          deleted_at: null,
        },
        orderBy: { created_at: "desc" },
      });

  if (!session) {
    throw new HttpException("Unauthorized: session not found or revoked", 401);
  }

  // Verify stored hash
  const hash = session.refresh_token_hash;
  const valid = hash ? await PasswordUtil.verify(refreshToken, hash) : false;
  if (!valid) {
    // Record suspicious activity in audit logs
    try {
      await MyGlobal.prisma.econ_political_forum_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          registereduser_id: session.registereduser_id,
          action_type: "refresh_token_mismatch",
          target_type: "session",
          target_identifier: session.id,
          details: JSON.stringify({ reason: "hash_mismatch", ip: null }),
          created_at: toISOStringSafe(new Date()),
          created_by_system: true,
        },
      });
    } catch (e) {
      // swallow audit logging errors
    }

    throw new HttpException("Unauthorized: invalid refresh token", 401);
  }

  // Rotate refresh token and update session
  const now = toISOStringSafe(new Date());
  const accessExpiresInSeconds = 60 * 60; // 1 hour
  const refreshExpiresInSeconds = 7 * 24 * 60 * 60; // 7 days

  const accessExpDate = toISOStringSafe(
    new Date(Date.now() + accessExpiresInSeconds * 1000),
  );
  const refreshExpDate = toISOStringSafe(
    new Date(Date.now() + refreshExpiresInSeconds * 1000),
  );

  const accessPayload = {
    id: session.registereduser_id,
    type: "administrator",
  };

  const newAccessToken = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: `${accessExpiresInSeconds}s`,
    issuer: "autobe",
  });

  const refreshPayload = {
    registereduser_id: session.registereduser_id,
    session_token: session.session_token,
    token_type: "refresh",
  };

  const newRefreshToken = jwt.sign(
    refreshPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: `${refreshExpiresInSeconds}s`,
      issuer: "autobe",
    },
  );

  const newRefreshHash = await PasswordUtil.hash(newRefreshToken);

  const updated = await MyGlobal.prisma.econ_political_forum_sessions.update({
    where: { id: session.id },
    data: {
      refresh_token_hash: newRefreshHash,
      expires_at: toISOStringSafe(
        new Date(Date.now() + refreshExpiresInSeconds * 1000),
      ),
      last_active_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Load user summary for response
  const user =
    await MyGlobal.prisma.econ_political_forum_registereduser.findUnique({
      where: { id: session.registereduser_id },
      select: {
        id: true,
        username: true,
        display_name: true,
        bio: true,
        avatar_uri: true,
        created_at: true,
        updated_at: true,
      },
    });

  // Record audit log for rotation
  try {
    await MyGlobal.prisma.econ_political_forum_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        registereduser_id: session.registereduser_id,
        action_type: "refresh_token_rotation",
        target_type: "session",
        target_identifier: session.id,
        details: JSON.stringify({ rotated_at: now }),
        created_at: now,
        created_by_system: true,
      },
    });
  } catch (e) {
    // non-fatal
  }

  const token: IAuthorizationToken = {
    access: newAccessToken,
    refresh: newRefreshToken,
    expired_at: accessExpDate as string & tags.Format<"date-time">,
    refreshable_until: refreshExpDate as string & tags.Format<"date-time">,
  };

  const result: IEconPoliticalForumAdministrator.IAuthorized = {
    id: session.registereduser_id,
    token,
    user: user
      ? {
          id: user.id,
          username: user.username,
          display_name: user.display_name ?? undefined,
          bio: user.bio ?? undefined,
          avatar_uri: user.avatar_uri ?? undefined,
          created_at: user.created_at
            ? toISOStringSafe(user.created_at)
            : undefined,
          updated_at: user.updated_at
            ? toISOStringSafe(user.updated_at)
            : undefined,
        }
      : undefined,
  };

  return result;
}
