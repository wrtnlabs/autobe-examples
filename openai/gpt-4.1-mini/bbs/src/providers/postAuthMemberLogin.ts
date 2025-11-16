import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postAuthMemberLogin(props: {
  member: MemberPayload;
  body: IEconPolDiscussionBoardMember.ILogin;
}): Promise<IEconPolDiscussionBoardMember.IAuthorized> {
  const now = new Date().toISOString();
  const accessExpires = new Date(Date.parse(now) + 1 * 60 * 60 * 1000);
  const refreshExpires = new Date(Date.parse(now) + 7 * 24 * 60 * 60 * 1000);

  const member =
    await MyGlobal.prisma.econ_pol_discussion_board_members.findFirst({
      where: {
        OR: [
          { username: props.body.username_or_email },
          { email: props.body.username_or_email },
        ],
        deleted_at: null,
      },
    });

  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }

  const passwordValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );

  if (!passwordValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  const session =
    await MyGlobal.prisma.econ_pol_discussion_board_member_sessions.create({
      data: {
        id: v4() as string & import("typia").tags.Format<"uuid">,
        econ_pol_discussion_board_member_id: member.id,
        ip: (props.body.ip ?? "") satisfies string as string,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: toISOStringSafe(accessExpires),
      },
    });

  const token = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: now,
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
        id: member.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  return {
    id: member.id,
    username: member.username,
    email: member.email,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at:
      member.deleted_at === null ? null : toISOStringSafe(member.deleted_at),
    token,
  };
}
