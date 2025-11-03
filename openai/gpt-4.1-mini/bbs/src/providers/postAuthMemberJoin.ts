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

export async function postAuthMemberJoin(props: {
  member: MemberPayload;
  body: IDiscussionBoardMember.ICreate;
}): Promise<IDiscussionBoardMember.IAuthorized> {
  const existingMember =
    await MyGlobal.prisma.discussion_board_members.findFirst({
      where: { email: props.body.email, deleted_at: null },
    });

  if (existingMember !== null) {
    throw new HttpException("Email already registered", 409);
  }

  const hashedPassword = await PasswordUtil.hash(props.body.password);

  const now = toISOStringSafe(new Date());
  const newMemberId = v4();

  const member = await MyGlobal.prisma.discussion_board_members.create({
    data: {
      id: newMemberId,
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: now,
      updated_at: now,
    },
  });

  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const sessionId = v4();
  const session = await MyGlobal.prisma.discussion_board_member_sessions.create(
    {
      data: {
        id: sessionId,
        discussion_board_member_id: member.id,
        created_at: now,
        expired_at: accessExpires,
        ip: "",
        href: "",
        referrer: "",
      },
    },
  );

  const token = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id as string & tags.Format<"uuid">,
        session_id: session.id as string & tags.Format<"uuid">,
        created_at: now as string & tags.Format<"date-time">,
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
        id: member.id as string & tags.Format<"uuid">,
        session_id: session.id as string & tags.Format<"uuid">,
        tokenType: "refresh",
        created_at: now as string & tags.Format<"date-time">,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  return {
    id: member.id as string & tags.Format<"uuid">,
    token,
  };
}
