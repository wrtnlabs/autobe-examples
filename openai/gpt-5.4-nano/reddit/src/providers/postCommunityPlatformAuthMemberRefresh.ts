import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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

export async function postCommunityPlatformAuthMemberRefresh(props: {
  body: ICommunityPlatformMember.IRefresh;
}): Promise<ICommunityPlatformMember.IAuthorized> {
  const refreshToken: string = props.body.refreshToken;
  // Verify JWT and decode payload
  let decoded: unknown;
  try {
    decoded = jwt.verify(refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const payload = typia.assert<{
    type: "member";
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    created_at: string & tags.Format<"date-time">;
  }>(decoded);
  if (payload.type !== "member") {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Compute timestamps as ISO strings without native Date usage in declarations/returns
  const nowIso = toISOStringSafe(new Date());
  const accessExpiredAtIso = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshableUntilIso = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const { id: memberId, session_id: sessionId } = payload;
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Validate session state (active, not soft-deleted, not expired)
    const session = await tx.community_platform_member_sessions.findFirst({
      where: {
        id: sessionId,
        community_platform_member_id: memberId,
        deleted_at: null,
        expired_at: {
          gt: nowIso,
        },
      },
      select: {
        id: true,
        community_platform_member_id: true,
        expired_at: true,
        updated_at: true,
      },
    });
    if (!session) {
      throw new HttpException("Invalid or expired refresh token", 401);
    }
    // Validate actor not deleted
    const member = await tx.community_platform_members.findUnique({
      where: { id: memberId },
      select: { id: true, deleted_at: true },
    });
    if (!member || member.deleted_at !== null) {
      throw new HttpException("Invalid or expired refresh token", 401);
    }
    // Rotate refresh token context atomically by extending session expiration
    await tx.community_platform_member_sessions.update({
      where: { id: session.id },
      data: {
        expired_at: refreshableUntilIso,
        updated_at: nowIso,
      },
    });
    // Issue new JWTs (same session_id)
    const accessToken = jwt.sign(
      {
        type: "member",
        id: memberId,
        session_id: sessionId,
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    const refreshTokenNext = jwt.sign(
      {
        type: "member",
        id: memberId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    return {
      memberId,
      accessToken,
      refreshTokenNext,
      expiredAt: accessExpiredAtIso,
      refreshableUntil: refreshableUntilIso,
    };
  });
  return {
    id: result.memberId,
    token: {
      access: result.accessToken,
      refresh: result.refreshTokenNext,
      expired_at: result.expiredAt,
      refreshable_until: result.refreshableUntil,
    },
  } satisfies ICommunityPlatformMember.IAuthorized;
}
