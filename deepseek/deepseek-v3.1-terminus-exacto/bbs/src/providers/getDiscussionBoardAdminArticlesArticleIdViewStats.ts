import { IDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStatEvent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardArticleViewStatEventTransformer } from "../transformers/DiscussionBoardArticleViewStatEventTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminArticlesArticleIdViewStats(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleViewStatEvent> {
  // First verify the article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // Retrieve the view statistics using findFirst (not findUnique)
  const stats =
    await MyGlobal.prisma.discussion_board_article_view_stats.findFirst({
      where: { discussion_board_article_id: props.articleId },
      ...DiscussionBoardArticleViewStatEventTransformer.select(),
    });
  if (!stats) {
    // Get current timestamp for created_at/updated_at
    const now = new Date().toISOString();
    // Return default/empty stats when none exist
    return {
      id: v4(),
      total_view_count: 0,
      unique_viewer_count: 0,
      last_viewed_at: null,
      average_time_spent_seconds: null,
      total_time_spent_seconds: 0,
      created_at: now,
      updated_at: now,
    };
  }
  return await DiscussionBoardArticleViewStatEventTransformer.transform(stats);
}
