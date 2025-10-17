import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthRegisteredUserRefresh(props: {
  body: IEconPoliticalForumRegisteredUser.IRefresh;
}): Promise<IEconPoliticalForumRegisteredUser.IAuthorized> {
  const { body } = props;
  const presented = body.refresh_token;

  // Try to treat refresh token as a signed JWT first to extract session id if present
  let session: Awaited<
    ReturnType<typeof MyGlobal.prisma.econ_political_forum_sessions.findFirst>
  > | null = null;
  try {
    const decoded = jwt.verify(presented, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as any;
    if (decoded && (decoded.sessionId || decoded.session_id)) {
      const sid = (decoded.sessionId ?? decoded.session_id) as string;
      session = await MyGlobal.prisma.econ_political_forum_sessions.findFirst({
        where: { id: sid, deleted_at: null },
      });
      // If session found, additionally verify hash to ensure token matches stored hash
      if (session && session.refresh_token_hash) {
        const ok = await PasswordUtil.verify(
          presented,
          session.refresh_token_hash,
        );
        if (!ok) session = null;
      }
    }
  } catch (e) {
    // ignore verification error; fallback to hash-scan lookup
  }

  // Fallback: scan active sessions and verify hash
  if (!session) {
    const candidates =
      await MyGlobal.prisma.econ_political_forum_sessions.findMany({
        where: { deleted_at: null, refresh_token_hash: { not: null } },
        orderBy: { created_at: "desc" },
      });

    for (const cand of candidates) {
      if (!cand.refresh_token_hash) continue;
      try {
        const matched = await PasswordUtil.verify(
          presented,
          cand.refresh_token_hash,
        );
        if (matched) {
          session = cand;
          break;
        }
      } catch (_err) {
        // continue
      }
    }
  }

  if (!session)
    throw new HttpException("Unauthorized: invalid refresh token", 401);

  // Check expiry
  const nowIso = toISOStringSafe(new Date());
  const sessionExpiresIso = session.expires_at
    ? toISOStringSafe(session.expires_at)
    : null;
  if (sessionExpiresIso !== null && sessionExpiresIso <= nowIso) {
    // Optionally revoke the session on expiry
    await MyGlobal.prisma.econ_political_forum_sessions.update({
      where: { id: session.id },
      data: {
        deleted_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
    throw new HttpException("Unauthorized: refresh token expired", 401);
  }

  // Load user
  const user =
    await MyGlobal.prisma.econ_political_forum_registereduser.findUniqueOrThrow(
      {
        where: { id: session.registereduser_id },
      },
    );

  // Rotate refresh token: issue new signed refresh token and persist its hash
  const newRefreshToken = jwt.sign(
    { sessionId: session.id, userId: user.id, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe", expiresIn: "7d" },
  );

  const newRefreshHash = await PasswordUtil.hash(newRefreshToken);

  const newRefreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const lastActive = toISOStringSafe(new Date());

  // Persist rotation
  await MyGlobal.prisma.econ_political_forum_sessions.update({
    where: { id: session.id },
    data: {
      refresh_token_hash: newRefreshHash,
      expires_at: newRefreshableUntil,
      last_active_at: lastActive,
      updated_at: lastActive,
    },
  });

  // Issue new access token
  const accessToken = jwt.sign(
    { id: user.id, type: "registereduser" },
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe", expiresIn: "1h" },
  );

  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 1 * 60 * 60 * 1000),
  );

  // Prepare response
  return {
    id: user.id as string & tags.Format<"uuid">,
    token: {
      access: accessToken,
      refresh: newRefreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: newRefreshableUntil,
    },
    username: user.username ?? undefined,
    display_name: user.display_name ?? null,
    avatar_uri: user.avatar_uri ?? null,
    email_verified: user.email_verified ?? undefined,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
  };
}
