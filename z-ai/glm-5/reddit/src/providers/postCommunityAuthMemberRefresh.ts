import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityAuthMemberRefresh(props: {
  body: ICommunityMember.IRefresh;
}): Promise<ICommunityMember.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
  };
  try {
    const payload = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    if (typeof payload === "string") {
      throw new HttpException("Invalid token format", 401);
    }
    decoded = typia.assert<{
      id: string;
      session_id: string;
      type: string;
    }>(payload);
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists and refresh token matches
  const session = await MyGlobal.prisma.community_member_sessions.findFirst({
    where: {
      id: decoded.session_id,
      community_member_id: decoded.id,
      refresh_token: props.body.refresh_token,
    },
  });
  if (!session) {
    throw new HttpException("Session not found or token revoked", 401);
  }
  // 4. Check session not expired
  const currentTime = Date.now();
  const sessionExpiredAtMs = new Date(session.expired_at).getTime();
  const refreshExpiresAtMs = new Date(session.refresh_expires_at).getTime();
  if (currentTime >= sessionExpiredAtMs || currentTime >= refreshExpiresAtMs) {
    throw new HttpException("Session expired", 401);
  }
  // 5. Validate member exists and not deleted
  const member = await MyGlobal.prisma.community_members.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 6. Calculate expiration times (for Prisma and response)
  const accessExpiresMs = currentTime + 30 * 60 * 1000; // 30 minutes
  const refreshExpiresMs = currentTime + 14 * 24 * 60 * 60 * 1000; // 14 days
  const accessExpiresDate = new Date(accessExpiresMs);
  const refreshExpiresDate = new Date(refreshExpiresMs);
  const nowIsoString = new Date(currentTime).toISOString();
  // 7. Generate new tokens (SAME session_id for session continuity)
  const newAccessToken = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowIsoString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30m", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: nowIsoString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "14d", issuer: "autobe" },
  );
  // 8. Update session with new tokens (token rotation)
  await MyGlobal.prisma.community_member_sessions.update({
    where: { id: decoded.session_id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      access_expires_at: accessExpiresDate,
      refresh_expires_at: refreshExpiresDate,
      expired_at: refreshExpiresDate,
    },
  });
  // 9. Build and return response
  const accessExpiresIso = toISOStringSafe(accessExpiresDate);
  const refreshExpiresIso = toISOStringSafe(refreshExpiresDate);
  return {
    id: member.id,
    username: member.username,
    email: member.email,
    display_name: member.display_name,
    bio: member.bio,
    avatar_url: member.avatar_url,
    karma: member.karma,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    accessToken: newAccessToken,
    expiredAt: accessExpiresIso,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpiresIso,
      refreshable_until: refreshExpiresIso,
    },
  };
}
