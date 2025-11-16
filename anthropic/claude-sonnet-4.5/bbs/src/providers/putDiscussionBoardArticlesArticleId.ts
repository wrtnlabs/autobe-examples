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

export async function putDiscussionBoardArticlesArticleId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.IUpdate;
}): Promise<IDiscussionBoardArticle> {
  const existing = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    select: {
      id: true,
      discussion_board_member_id: true,
      deleted_at: true,
    },
  });

  if (!existing) {
    throw new HttpException("Article not found", 404);
  }

  if (existing.discussion_board_member_id !== props.member.id) {
    throw new HttpException(
      "Forbidden: You can only update your own articles",
      403,
    );
  }

  if (existing.deleted_at !== null) {
    throw new HttpException("Cannot update a deleted article", 400);
  }

  const updated = await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: props.articleId },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.body !== undefined && { body: props.body.body }),
      updated_at: new Date(),
    },
    include: {
      member: {
        select: {
          id: true,
          username: true,
          email: true,
          status: true,
          email_verified: true,
          created_at: true,
        },
      },
    },
  });

  return {
    id: updated.id,
    title: updated.title,
    body: updated.body,
    view_count: updated.view_count,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
    author: {
      id: updated.member.id,
      username: updated.member.username,
      email: updated.member.email,
      status: updated.member.status,
      email_verified: updated.member.email_verified,
      created_at: toISOStringSafe(updated.member.created_at),
    },
  };
}
