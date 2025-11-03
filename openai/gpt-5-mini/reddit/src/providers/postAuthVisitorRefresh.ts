import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsVisitor";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthVisitorRefresh(props: {
  body: ICommunityBbsVisitor.IRefresh;
}): Promise<ICommunityBbsVisitor.IAuthorized> {
  const { body } = props;

  // Verify & decode the refresh token
  let decoded: { id: string; session_id: string; type: "visitor" };
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as { id: string; session_id: string; type: "visitor" };
  } catch (err) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // If client provided a session_id, enforce binding
  if (body.session_id !== undefined && body.session_id !== null) {
    if (body.session_id !== decoded.session_id) {
      throw new HttpException(
        "Refresh token does not match provided session",
        401,
      );
    }
  }

  // Load session and linked visitor
  const session =
    await MyGlobal.prisma.community_bbs_visitor_sessions.findFirst({
      where: {
        id: decoded.session_id,
        community_bbs_visitor_id: decoded.id,
      },
      include: { visitor: true },
    });

  if (!session) throw new HttpException("Session expired or revoked", 401);

  // Visitor must be active
  if (session.visitor.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  // Check session expiry
  if (session.expired_at && session.expired_at.getTime() <= Date.now()) {
    throw new HttpException("Session expired", 401);
  }

  // Rate-limit: allow up to 5 refreshes per visitor per minute
  const since = new Date(Date.now() - 60 * 1000);
  const recent = await MyGlobal.prisma.community_bbs_audit_logs.count({
    where: {
      actor_type: "visitor",
      actor_id: decoded.id,
      action: "token.refresh",
      created_at: { gte: since },
    },
  });
  if (recent >= 5) throw new HttpException("Too many refresh attempts", 429);

  // Generate token timestamps
  const nowIso = toISOStringSafe(new Date());
  const accessIso = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshIso = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // Create new tokens (reuse same session_id)
  const access = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refresh = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Update session expiry and visitor last_seen
  await MyGlobal.prisma.community_bbs_visitor_sessions.update({
    where: { id: session.id },
    data: {
      expired_at: refreshIso,
    },
  });

  await MyGlobal.prisma.community_bbs_visitor.update({
    where: { id: session.community_bbs_visitor_id },
    data: { last_seen_at: nowIso },
  });

  // Record audit log for this refresh
  await MyGlobal.prisma.community_bbs_audit_logs.create({
    data: {
      id: v4(),
      actor_type: "visitor",
      actor_id: decoded.id,
      entity: "session",
      action: "token.refresh",
      payload: `session:${session.id}`,
      ip: body.ip ?? session.visitor.ip,
      created_at: nowIso,
      updated_at: nowIso,
    },
  });

  // Build response converting dates to ISO strings as required by DTO
  return {
    id: session.community_bbs_visitor_id,
    ip: session.visitor.ip ?? undefined,
    user_agent: session.visitor.user_agent ?? null,
    first_seen_at: session.visitor.first_seen_at
      ? toISOStringSafe(session.visitor.first_seen_at)
      : undefined,
    last_seen_at: session.visitor.last_seen_at
      ? toISOStringSafe(session.visitor.last_seen_at)
      : undefined,
    deleted_at: session.visitor.deleted_at
      ? toISOStringSafe(session.visitor.deleted_at)
      : null,
    session_id: session.id,
    token: {
      access,
      refresh,
      expired_at: accessIso,
      refreshable_until: refreshIso,
    },
  };
}
