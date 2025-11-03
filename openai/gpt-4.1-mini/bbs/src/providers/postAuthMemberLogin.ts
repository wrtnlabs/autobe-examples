import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postAuthMemberLogin(props: {
  member: MemberPayload;
  body: IDiscussionBoardMember.ILogin;
}): Promise<IDiscussionBoardMember.IAuthorized> {
  const member = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }

  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const session = await MyGlobal.prisma.discussion_board_member_sessions.create(
    {
      data: {
        id: v4(),
        discussion_board_member_id: member.id,
        ip: props.body.ip ?? "",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: accessExpires,
      },
    },
  );

  return {
    id: member.id,
    token: {
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
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
