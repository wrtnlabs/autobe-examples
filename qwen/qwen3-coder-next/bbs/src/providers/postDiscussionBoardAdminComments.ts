import { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postDiscussionBoardAdminComments(props: {
  admin: AdminPayload;
  body: IDiscussionBoardArticleComment.ICreate;
}): Promise<IDiscussionBoardArticleComment> {
  // Find the article to ensure it exists
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.body as string & tags.Format<"uuid"> },
  });
  if (!article) throw new HttpException("Article not found", 404);
  // Create the comment
  const created = await MyGlobal.prisma.discussion_board_comments.create({
    data: {
      id: v4(),
      content: props.body as string,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      discussion_board_member_id: props.admin.id,
      discussion_board_article_id: article.id,
    },
  });
  // Transform to response DTO
  return {
    id: created.id,
    content: created.content,
    article_id: created.discussion_board_article_id,
    author_id: created.discussion_board_member_id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
