import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberArticles(props: {
  member: MemberPayload;
  body: IDiscussionBoardArticle.ICreate;
}): Promise<IDiscussionBoardArticle> {
  const now = new Date();

  const created = await MyGlobal.prisma.discussion_board_articles.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      title: props.body.title,
      body: props.body.body,
      discussion_board_member_id: props.member.id,
      discussion_board_member_session_id: props.member.session_id,
      view_count: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  const memberInfo = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: props.member.id },
    select: {
      id: true,
      username: true,
      email: true,
      status: true,
      email_verified: true,
      created_at: true,
    },
  });

  if (!memberInfo) {
    throw new HttpException("Member not found", 404);
  }

  return {
    id: created.id,
    title: created.title,
    body: created.body,
    view_count: created.view_count,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
    author: {
      id: memberInfo.id,
      username: memberInfo.username,
      email: memberInfo.email,
      status: memberInfo.status,
      email_verified: memberInfo.email_verified,
      created_at: toISOStringSafe(memberInfo.created_at),
    },
  };
}
