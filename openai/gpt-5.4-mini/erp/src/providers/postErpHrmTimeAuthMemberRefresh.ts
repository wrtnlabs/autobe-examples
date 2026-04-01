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
  type IRefreshJwtPayload = {
    id: string;
    session_id: string;
    type: "member";
  };
  const unauthorized = (): never => {
    throw new HttpException("Unauthorized", 401);
  };
  const verifiedPayload = (() => {
    try {
      const verified: unknown = jwt.verify(
        props.body.refreshToken,
        MyGlobal.env.JWT_SECRET_KEY,
        { issuer: "autobe" },
      );
      if (
        typeof verified === "string" ||
        verified === null ||
        typeof verified !== "object"
      ) {
        unauthorized();
      }
      const payload = verified as {
        id?: unknown;
        session_id?: unknown;
        type?: unknown;
      };
      if (
        typeof payload.id !== "string" ||
        typeof payload.session_id !== "string" ||
        payload.type !== "member"
      ) {
        unauthorized();
      }
      return {
        id: payload.id,
        session_id: payload.session_id,
        type: "member",
      } satisfies IRefreshJwtPayload;
    } catch {
      unauthorized();
    }
  })();
  const session = await MyGlobal.prisma.erp_hrm_time_member_sessions.findFirst({
    where: {
      id: verifiedPayload.session_id,
      erp_hrm_time_member_id: verifiedPayload.id,
    },
    select: {
      id: true,
      erp_hrm_time_member_id: true,
    },
  });
  if (!session) unauthorized();
  const member = await MyGlobal.prisma.erp_hrm_time_members.findUniqueOrThrow({
    where: { id: verifiedPayload.id },
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
  if (member.deleted_at !== null) unauthorized();
  const now = new Date();
  const accessExpiredAt = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshableUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "member",
      id: verifiedPayload.id,
      session_id: verifiedPayload.session_id,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: verifiedPayload.id,
      session_id: verifiedPayload.session_id,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.erp_hrm_time_member_sessions.update({
    where: { id: verifiedPayload.session_id },
    data: { expired_at: refreshableUntil },
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
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpiredAt),
      refreshable_until: toISOStringSafe(refreshableUntil),
    },
  };
}
