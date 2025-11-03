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

export async function postAuthVisitorJoin(props: {
  body: ICommunityBbsVisitor.ICreate;
}): Promise<ICommunityBbsVisitor.IAuthorized> {
  const { body } = props;
  const { session_context } = body;

  // Ensure required session_context fields exist (controller validation expected, but guard for safety)
  if (
    !session_context ||
    session_context.href === null ||
    session_context.referrer === null
  ) {
    throw new HttpException(
      "Bad Request: session_context.href and session_context.referrer are required",
      400,
    );
  }

  // TTL defaults and caps
  const requestedTtl = session_context.session_ttl_seconds ?? 3600;
  const ttl = Math.min(requestedTtl, 86400); // cap to 1 day

  // Prepare timestamps once
  const nowIso = toISOStringSafe(new Date());
  const accessExpiresIso = toISOStringSafe(new Date(Date.now() + ttl * 1000));
  const refreshExpiresIso = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // Simple abuse mitigation: cap sessions created from same IP in last hour (best-effort)
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentSessionCount =
      await MyGlobal.prisma.community_bbs_visitor_sessions.count({
        where: {
          ip: body.ip ?? undefined,
          created_at: { gte: oneHourAgo },
        },
      });

    if (recentSessionCount > 300) {
      throw new HttpException("Too Many Requests", 429);
    }
  } catch (err) {
    if (err instanceof HttpException) throw err;
    // ignore counting errors and continue; not critical for functionality
  }

  // Find an active fingerprint
  const found = await MyGlobal.prisma.community_bbs_visitor.findFirst({
    where: {
      ip: body.ip ?? undefined,
      user_agent: body.user_agent ?? undefined,
      deleted_at: null,
    },
  });

  // If found and deleted_at exists, treat as removed (create fresh fingerprint)
  const shouldCreateFresh = !!found && !!found.deleted_at;

  // Use transaction to keep visitor update/create + session creation atomic
  if (found && !shouldCreateFresh) {
    const updatedVisitor = await MyGlobal.prisma.$transaction(async (tx) => {
      const u = await tx.community_bbs_visitor.update({
        where: { id: found.id },
        data: {
          last_seen_at: toISOStringSafe(new Date()),
          user_agent: body.user_agent ?? found.user_agent,
          ip: body.ip ?? found.ip,
        },
      });

      const session = await tx.community_bbs_visitor_sessions.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          community_bbs_visitor_id: u.id,
          ip: body.ip ?? u.ip,
          href: session_context.href,
          referrer: session_context.referrer,
          created_at: toISOStringSafe(new Date()),
          expired_at: accessExpiresIso,
        },
      });

      return { visitor: u, session };
    });

    const { visitor, session } = updatedVisitor;

    const token = {
      access: jwt.sign(
        {
          type: "visitor",
          id: visitor.id,
          session_id: session.id,
          created_at: nowIso,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" },
      ),
      refresh: jwt.sign(
        {
          type: "visitor",
          id: visitor.id,
          session_id: session.id,
          tokenType: "refresh",
          created_at: nowIso,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      expired_at: accessExpiresIso,
      refreshable_until: refreshExpiresIso,
    } satisfies IAuthorizationToken;

    return {
      id: visitor.id as string & tags.Format<"uuid">,
      ip: visitor.ip,
      user_agent: visitor.user_agent ?? null,
      first_seen_at: toISOStringSafe(visitor.first_seen_at),
      last_seen_at: toISOStringSafe(visitor.last_seen_at),
      deleted_at: visitor.deleted_at
        ? toISOStringSafe(visitor.deleted_at)
        : null,
      session_id: session.id as string & tags.Format<"uuid">,
      token,
    } satisfies ICommunityBbsVisitor.IAuthorized;
  }

  // Create new visitor + session in a transaction
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    const createdVisitor = await tx.community_bbs_visitor.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        ip: body.ip ?? "",
        user_agent: body.user_agent ?? null,
        first_seen_at: toISOStringSafe(new Date()),
        last_seen_at: toISOStringSafe(new Date()),
        deleted_at: null,
      },
    });

    const createdSession = await tx.community_bbs_visitor_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_bbs_visitor_id: createdVisitor.id,
        ip: body.ip ?? createdVisitor.ip,
        href: session_context.href,
        referrer: session_context.referrer,
        created_at: toISOStringSafe(new Date()),
        expired_at: accessExpiresIso,
      },
    });

    return { createdVisitor, createdSession };
  });

  const { createdVisitor, createdSession } = result;

  const token = {
    access: jwt.sign(
      {
        type: "visitor",
        id: createdVisitor.id,
        session_id: createdSession.id,
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "visitor",
        id: createdVisitor.id,
        session_id: createdSession.id,
        tokenType: "refresh",
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresIso,
    refreshable_until: refreshExpiresIso,
  } satisfies IAuthorizationToken;

  return {
    id: createdVisitor.id as string & tags.Format<"uuid">,
    ip: createdVisitor.ip,
    user_agent: createdVisitor.user_agent ?? null,
    first_seen_at: toISOStringSafe(createdVisitor.first_seen_at),
    last_seen_at: toISOStringSafe(createdVisitor.last_seen_at),
    deleted_at: createdVisitor.deleted_at
      ? toISOStringSafe(createdVisitor.deleted_at)
      : null,
    session_id: createdSession.id as string & tags.Format<"uuid">,
    token,
  } satisfies ICommunityBbsVisitor.IAuthorized;
}
