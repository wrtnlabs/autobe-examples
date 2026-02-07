import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdminArticlesArticleId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticle> {
  // First verify the article exists and is not already deleted
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId, deleted_at: null },
    ...DiscussionBoardArticleTransformer.select(),
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Perform soft deletion by setting deleted_at timestamp
  const currentTime = toISOStringSafe(new Date());
  const updatedArticle = await MyGlobal.prisma.discussion_board_articles.update(
    {
      where: { id: props.articleId },
      data: {
        deleted_at: currentTime,
        updated_at: currentTime,
      },
      ...DiscussionBoardArticleTransformer.select(),
    },
  );
  // Cascade deletion to related entities (comments, files, tags, favorites)
  // This would be handled by database cascade constraints or separate updates
  // For now, we'll focus on the main article deletion
  return await DiscussionBoardArticleTransformer.transform(updatedArticle);
}
