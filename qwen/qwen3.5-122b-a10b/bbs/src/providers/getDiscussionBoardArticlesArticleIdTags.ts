import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardTagAtSummaryTransformer } from "../transformers/DiscussionBoardTagAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardArticlesArticleIdTags(props: {
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardTag.ISummary[]> {
  // Verify article exists (404 if not found)
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // Query article-tag associations with tag data, filtering soft-deleted records
  const articleTags =
    await MyGlobal.prisma.discussion_board_article_tags.findMany({
      where: {
        discussion_board_article_id: props.articleId,
        deleted_at: null,
        tag: {
          deleted_at: null,
        },
      },
      select: {
        tag: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  // Transform each tag to summary DTO
  return await ArrayUtil.asyncMap(articleTags, (at) =>
    DiscussionBoardTagAtSummaryTransformer.transform(at.tag),
  );
}
