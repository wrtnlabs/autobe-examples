import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthCommunityMemberRefresh(props: {
  body: ICommunityBbsCommunityMember.IRefresh;
}): Promise<ICommunityBbsCommunityMember.IAuthorized> {
  const { body } = props;

  // Resolve session id and member id from request
  let sessionId: string;
  let subjectMemberId: string | undefined;

  if (body.grant_type === "refresh_token") {
    // Verify refresh token
    let decoded: { id: string; session_id: string; type: string };
    try {
      decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
        issuer: "autobe",
      }) as { id: string; session_id: string; type: string };
    } catch (err) {
      throw new HttpException("Invalid or expired refresh token", 401);
    }

    if (decoded.type !== "communitymember") {
      throw new HttpException("Invalid token type", 403);
    }

    sessionId = decoded.session_id;
    subjectMemberId = decoded.id;
  } else if (body.grant_type === "session_id") {
    sessionId = body.session_id;
  } else {
    throw new HttpException("Unsupported grant_type", 400);
  }

  // Fetch session with member relation
  const session =
    await MyGlobal.prisma.community_bbs_communitymember_sessions.findUnique({
      where: { id: sessionId },
      include: { communityMember: true },
    });

  if (!session) throw new HttpException("Session expired or revoked", 401);

  // Ensure session belongs to the same subject when provided
  if (
    subjectMemberId &&
    session.community_bbs_communitymember_id !== subjectMemberId
  ) {
    throw new HttpException("Session does not match token subject", 403);
  }

  const member = session.communityMember;
  if (!member) throw new HttpException("Member not found", 401);
  if (member.deleted_at !== null)
    throw new HttpException("Account has been deleted", 403);

  // Prepare timestamps and tokens
  const nowIso = toISOStringSafe(new Date());
  const accessExpiresDate = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpiresDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const accessExpiresIso = toISOStringSafe(accessExpiresDate);
  const refreshExpiresIso = toISOStringSafe(refreshExpiresDate);

  const access = jwt.sign(
    {
      type: "communitymember",
      id: member.id,
      session_id: session.id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refresh = jwt.sign(
    {
      type: "communitymember",
      id: member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Update session expiration to reflect rotated refresh token lifetime
  await MyGlobal.prisma.community_bbs_communitymember_sessions.update({
    where: { id: session.id },
    data: { expired_at: refreshExpiresIso },
  });

  // Map member summary
  const memberSummary: ICommunityBbsCommunityMember.ISummary = {
    id: member.id,
    username: member.username,
    display_name: member.display_name ?? null,
    karma: member.karma,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
  };

  // Map session summary
  const sessionSummary: ICommunityBbsCommunityMember.ISession = {
    id: session.id,
    ip: session.ip,
    href: session.href ?? null,
    referrer: session.referrer ?? null,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
  };

  return {
    member: memberSummary,
    token: {
      access,
      refresh,
      expired_at: accessExpiresIso,
      refreshable_until: refreshExpiresIso,
    },
    session: sessionSummary,
  };
}
