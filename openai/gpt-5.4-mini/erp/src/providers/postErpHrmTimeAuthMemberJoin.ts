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

export async function postErpHrmTimeAuthMemberJoin(props: {
  ip: string;
  body: IErpHrmTimeMember.IJoin;
}): Promise<IErpHrmTimeMember.IAuthorized> {
  const existing = await MyGlobal.prisma.erp_hrm_time_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (existing !== null)
    throw new HttpException("Email already registered", 409);
  const member = await MyGlobal.prisma.erp_hrm_time_members.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      display_name: props.body.displayName,
      avatar_image_url: props.body.avatarImageUrl ?? null,
      phone_number: props.body.phoneNumber ?? null,
      created_at: toISOStringSafe(new globalThis.Date())
        ? new globalThis.Date()
        : new globalThis.Date(),
      updated_at: toISOStringSafe(new globalThis.Date())
        ? new globalThis.Date()
        : new globalThis.Date(),
      deleted_at: null,
    },
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
  const now = new globalThis.Date();
  const issuedAt = now.toISOString();
  const accessExpiredAt = new globalThis.Date(
    now.getTime() + 60 * 60 * 1000,
  ).toISOString();
  const refreshableUntil = new globalThis.Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const sessionId = v4();
  return {
    id: member.id,
    email: member.email,
    displayName: member.display_name,
    avatarImageUrl: member.avatar_image_url,
    phoneNumber: member.phone_number,
    createdAt: member.created_at.toISOString(),
    updatedAt: member.updated_at.toISOString(),
    deletedAt: member.deleted_at?.toISOString() ?? null,
    token: {
      access: jwt.sign(
        {
          type: "member",
          id: member.id,
          session_id: sessionId,
          created_at: issuedAt,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" },
      ),
      refresh: jwt.sign(
        {
          type: "member",
          id: member.id,
          session_id: sessionId,
          tokenType: "refresh",
          created_at: issuedAt,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
