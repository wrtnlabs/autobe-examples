import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeAuthMemberRefresh(props: {
  body: IErpHrmTimeMember.IRefresh;
}): Promise<IErpHrmTimeMember.IAuthorized> {
  type DecodedRefreshToken = {
    id: string;
    session_id: string;
    type: string;
  };
  let decoded: DecodedRefreshToken;
  try {
    const verified: string | jwt.JwtPayload = jwt.verify(
      props.body.refreshToken,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    if (typeof verified === "string") {
      throw new HttpException("Invalid or expired refresh token", 401);
    }
    if (
      typeof verified.id !== "string" ||
      typeof verified.session_id !== "string" ||
      typeof verified.type !== "string"
    ) {
      throw new HttpException("Invalid or expired refresh token", 401);
    }
    decoded = {
      id: verified.id,
      session_id: verified.session_id,
      type: verified.type,
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 403);
  }
  const session = await MyGlobal.prisma.erp_hrm_time_member_sessions.findFirst({
    where: {
      id: decoded.session_id,
      erp_hrm_time_member_id: decoded.id,
    },
    select: {
      id: true,
      erp_hrm_time_member_id: true,
      expired_at: true,
    },
  });
  if (session === null) {
    throw new HttpException("Session expired or revoked", 401);
  }
  if (session.expired_at.getTime() <= new Date().getTime()) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const member = await MyGlobal.prisma.erp_hrm_time_members.findUniqueOrThrow({
    where: { id: decoded.id },
    select: {
      id: true,
      email: true,
      display_name: true,
      avatar_image_url: true,
      phone_number: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const now = new Date();
  const accessExpiredAt = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshableUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const currentIso = toISOStringSafe(now);
  await MyGlobal.prisma.erp_hrm_time_member_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: refreshableUntil,
    },
  });
  return {
    id: member.id,
    email: member.email,
    displayName: member.display_name,
    avatarImageUrl: member.avatar_image_url,
    phoneNumber: member.phone_number,
    createdAt: toISOStringSafe(member.created_at),
    updatedAt: toISOStringSafe(member.updated_at),
    deletedAt:
      member.deleted_at === null ? null : toISOStringSafe(member.deleted_at),
    token: {
      access: jwt.sign(
        {
          type: "member",
          id: decoded.id,
          session_id: decoded.session_id,
          created_at: currentIso,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        {
          expiresIn: "1h",
          issuer: "autobe",
        },
      ),
      refresh: jwt.sign(
        {
          type: "member",
          id: decoded.id,
          session_id: decoded.session_id,
          created_at: currentIso,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        {
          expiresIn: "7d",
          issuer: "autobe",
        },
      ),
      expired_at: toISOStringSafe(accessExpiredAt),
      refreshable_until: toISOStringSafe(refreshableUntil),
    },
  };
}
