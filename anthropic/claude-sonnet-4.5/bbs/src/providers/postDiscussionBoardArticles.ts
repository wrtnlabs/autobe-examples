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

export async function postDiscussionBoardArticles(props: {
  member: MemberPayload;
  body: IDiscussionBoardArticle.ICreate;
}): Promise<IDiscussionBoardArticle> {
  const now = new Date();

  const article = await MyGlobal.prisma.discussion_board_articles.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_member_id: props.member.id,
      discussion_board_member_session_id: props.member.session_id,
      title: props.body.title,
      body: props.body.body,
      view_count: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    include: {
      member: true,
    },
  });

  return {
    id: article.id,
    title: article.title,
    body: article.body,
    view_count: article.view_count,
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
    deleted_at: article.deleted_at ? toISOStringSafe(article.deleted_at) : null,
    author: {
      id: article.member.id,
      username: article.member.username,
      email: article.member.email,
      status: article.member.status,
      email_verified: article.member.email_verified,
      created_at: toISOStringSafe(article.member.created_at),
    },
  };
}
