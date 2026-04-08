import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackAuthMemberRefresh(props: {
  body: IHrmTimeTrackMember.IRefresh;
}): Promise<IHrmTimeTrackMember.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
  };
  try {
    const verified = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    // Type guard to validate JWT payload structure
    if (
      !verified ||
      typeof verified !== "object" ||
      typeof (verified as any).id !== "string" ||
      typeof (verified as any).session_id !== "string" ||
      typeof (verified as any).type !== "string"
    ) {
      throw new HttpException("Invalid or expired refresh token", 401);
    }
    decoded = verified as {
      id: string;
      session_id: string;
      type: string;
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists and is active
  const session =
    await MyGlobal.prisma.hrm_time_track_member_sessions.findFirst({
      where: {
        id: decoded.session_id,
        hrm_time_track_member_id: decoded.id,
      },
      select: {
        id: true,
        hrm_time_track_member_id: true,
        expired_at: true,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Check session has not expired
  if (session.expired_at.getTime() <= Date.now()) {
    throw new HttpException("Session has expired", 403);
  }
  // 5. Validate member is not deleted
  const member = await MyGlobal.prisma.hrm_time_track_members.findUniqueOrThrow(
    {
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 6. Generate new tokens (SAME session_id)
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session expiration
  await MyGlobal.prisma.hrm_time_track_member_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 8. Return authorization response
  return {
    id: member.id as string & tags.Format<"uuid">,
    email: member.email,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: null,
    token: {
      access: accessToken as string,
      refresh: refreshToken as string,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
