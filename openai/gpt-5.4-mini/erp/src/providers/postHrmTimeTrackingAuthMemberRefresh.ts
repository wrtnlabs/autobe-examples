import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingAuthMemberRefresh(props: {
  body: IHrmTimeTrackingMember.IRefresh;
}): Promise<IHrmTimeTrackingMember.IAuthorized> {
  const decoded: unknown = jwt.verify(
    props.body.refreshToken,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  );
  const isRefreshPayload = (
    value: unknown,
  ): value is {
    type: string;
    id: string;
    session_id: string;
  } =>
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    "id" in value &&
    "session_id" in value &&
    typeof (
      value as {
        type: unknown;
      }
    ).type === "string" &&
    typeof (
      value as {
        id: unknown;
      }
    ).id === "string" &&
    typeof (
      value as {
        session_id: unknown;
      }
    ).session_id === "string";
  if (!isRefreshPayload(decoded))
    throw new HttpException("Invalid or expired refresh token", 401);
  if (decoded.type !== "member")
    throw new HttpException("Invalid token type", 403);
  const member =
    await MyGlobal.prisma.hrm_time_tracking_members.findUniqueOrThrow({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        is_active: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const deletedAt = member.deleted_at;
  if (member.is_active === false || deletedAt !== null)
    throw new HttpException("Account has been deleted", 403);
  const session =
    await MyGlobal.prisma.hrm_time_tracking_member_sessions.findFirst({
      where: {
        id: decoded.session_id,
        hrm_time_tracking_member_id: member.id,
      },
      select: {
        id: true,
        hrm_time_tracking_member_id: true,
      },
    });
  if (!session) throw new HttpException("Session expired or revoked", 401);
  const createdAt = toISOStringSafe(new Date());
  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe", expiresIn: "1h" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: createdAt,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe", expiresIn: "7d" },
  );
  await MyGlobal.prisma.hrm_time_tracking_member_sessions.update({
    where: { id: session.id },
    data: {
      expired_at: new Date(refreshableUntil),
    },
  });
  return {
    id: member.id,
    email: member.email,
    isActive: member.is_active,
    lastLoginAt:
      member.last_login_at !== null
        ? toISOStringSafe(member.last_login_at)
        : null,
    createdAt: toISOStringSafe(member.created_at),
    updatedAt: toISOStringSafe(member.updated_at),
    deletedAt: deletedAt !== null ? toISOStringSafe(deletedAt) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
