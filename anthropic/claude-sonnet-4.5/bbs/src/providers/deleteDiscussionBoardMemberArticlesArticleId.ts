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

export async function deleteDiscussionBoardMemberArticlesArticleId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticle> {
  const existing = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    include: {
      member: true,
    },
  });

  if (!existing) {
    throw new HttpException("Article not found", 404);
  }

  if (existing.discussion_board_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }

  const now = new Date();
  const deleted = await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: props.articleId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
    include: {
      member: true,
    },
  });

  return {
    id: deleted.id,
    title: deleted.title,
    body: deleted.body,
    view_count: deleted.view_count,
    created_at: toISOStringSafe(deleted.created_at),
    updated_at: toISOStringSafe(deleted.updated_at),
    deleted_at: deleted.deleted_at ? toISOStringSafe(deleted.deleted_at) : null,
    author: {
      id: deleted.member.id,
      username: deleted.member.username,
      email: deleted.member.email,
      status: deleted.member.status,
      email_verified: deleted.member.email_verified,
      created_at: toISOStringSafe(deleted.member.created_at),
    },
  };
}
