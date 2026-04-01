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
  if (existing !== null) {
    throw new HttpException("Email already registered", 409);
  }
  const nowIso: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const accessExpiredAtIso: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(new Date(nowIso).getTime() + 60 * 60 * 1000),
  );
  const refreshableUntilIso: string & tags.Format<"date-time"> =
    toISOStringSafe(
      new Date(new Date(nowIso).getTime() + 7 * 24 * 60 * 60 * 1000),
    );
  const memberId: string & tags.Format<"uuid"> = v4();
  const sessionId: string & tags.Format<"uuid"> = v4();
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const saved = await MyGlobal.prisma.$transaction(async (prisma) => {
    const member = await prisma.erp_hrm_time_members.create({
      data: {
        id: memberId,
        email: props.body.email,
        password_hash: passwordHash,
        display_name: props.body.name,
        avatar_image_url: null,
        phone_number: null,
        created_at: new Date(nowIso),
        updated_at: new Date(nowIso),
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
    const session = await prisma.erp_hrm_time_member_sessions.create({
      data: {
        id: sessionId,
        erp_hrm_time_member_id: member.id,
        ip: props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: new Date(nowIso),
        expired_at: new Date(accessExpiredAtIso),
      },
      select: {
        id: true,
      },
    });
    return {
      member,
      session,
    };
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: saved.member.id,
        session_id: saved.session.id,
        created_at: nowIso,
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
        id: saved.member.id,
        session_id: saved.session.id,
        tokenType: "refresh",
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpiredAtIso,
    refreshable_until: refreshableUntilIso,
  };
  return {
    id: saved.member.id,
    email: saved.member.email,
    displayName: saved.member.display_name,
    avatarImageUrl: saved.member.avatar_image_url,
    phoneNumber: saved.member.phone_number,
    createdAt: saved.member.created_at.toISOString(),
    updatedAt: saved.member.updated_at.toISOString(),
    deletedAt:
      saved.member.deleted_at === null
        ? null
        : saved.member.deleted_at.toISOString(),
    token,
  };
}
