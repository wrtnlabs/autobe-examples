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

export async function postErpHrmTimeAuthMemberLogin(props: {
  ip: string;
  body: IErpHrmTimeMember.ILogin;
}): Promise<IErpHrmTimeMember.IAuthorized> {
  const member = await MyGlobal.prisma.erp_hrm_time_members.findFirst({
    where: {
      email: props.body.email,
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
      password_hash: true,
    },
  });
  if (!member) throw new HttpException("Invalid credentials", 401);
  const passwordValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!passwordValid) throw new HttpException("Invalid credentials", 401);
  const issuedAt = new Date();
  const accessExpiredAt = new Date(issuedAt.getTime() + 60 * 60 * 1000);
  const refreshExpiredAt = new Date(
    issuedAt.getTime() + 7 * 24 * 60 * 60 * 1000,
  );
  const session = await MyGlobal.prisma.erp_hrm_time_member_sessions.create({
    data: {
      id: v4(),
      erp_hrm_time_member_id: member.id,
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: issuedAt.toISOString(),
      expired_at: accessExpiredAt.toISOString(),
    },
  });
  const createdAt = issuedAt.toISOString();
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiredAt.toISOString(),
    refreshable_until: refreshExpiredAt.toISOString(),
  };
  return {
    id: member.id,
    email: member.email,
    displayName: member.display_name,
    avatarImageUrl: member.avatar_image_url,
    phoneNumber: member.phone_number,
    createdAt: member.created_at.toISOString(),
    updatedAt: member.updated_at.toISOString(),
    deletedAt:
      member.deleted_at === null ? null : member.deleted_at.toISOString(),
    token,
  };
}
