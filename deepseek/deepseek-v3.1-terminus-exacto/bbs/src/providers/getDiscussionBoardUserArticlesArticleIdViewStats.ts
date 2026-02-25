import { IDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStatEvent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardArticleViewStatEventTransformer } from "../transformers/DiscussionBoardArticleViewStatEventTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardUserArticlesArticleIdViewStats(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleViewStatEvent> {
  // First verify article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // Retrieve view statistics for the article using transformer
  const stats =
    await MyGlobal.prisma.discussion_board_article_view_stats.findUnique({
      where: { discussion_board_article_id: props.articleId },
      ...DiscussionBoardArticleViewStatEventTransformer.select(),
    });
  // If statistics exist, transform and return
  if (stats) {
    return await DiscussionBoardArticleViewStatEventTransformer.transform(
      stats,
    );
  }
  // No statistics available - return default structure
  return {
    id: v4() as string & tags.Format<"uuid">,
    total_view_count: 0,
    unique_viewer_count: 0,
    last_viewed_at: null,
    average_time_spent_seconds: null,
    total_time_spent_seconds: 0,
    created_at: new Date().toISOString() as string & tags.Format<"date-time">,
    updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
  } satisfies IDiscussionBoardArticleViewStatEvent;
}
