import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminArticlesArticleId(props: {
  superAdmin: SuperadminPayload;
  articleId: string;
  body: IDiscussionBoardArticle.IUpdate;
}): Promise<IDiscussionBoardArticle> {
  // Query the article by ID
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  // Verify the article exists
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Update the article - only update fields that exist in IUpdate interface
  const updated = await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: props.articleId },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Return the updated article with correct property mappings
  return {
    id: updated.id as string & tags.Format<"uuid">,
    title: updated.title,
    content: updated.content,
    section_id: updated.section_id as string & tags.Format<"uuid">,
    author_id: updated.author_id as string & tags.Format<"uuid">,
    view_count: updated.view_count,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
