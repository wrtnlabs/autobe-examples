import { IDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStatEvent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardArticleViewStatEventTransformer } from "../transformers/DiscussionBoardArticleViewStatEventTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminArticlesArticleIdViewStats(props: {
  superAdmin: SuperAdminPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleViewStatEvent> {
  // Validate that the article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // Retrieve view statistics for the article
  const stats =
    await MyGlobal.prisma.discussion_board_article_view_stats.findUnique({
      where: { discussion_board_article_id: props.articleId },
      ...DiscussionBoardArticleViewStatEventTransformer.select(),
    });
  // If no statistics record exists, return empty statistics
  if (stats === null) {
    const now = new Date();
    const currentTimestamp = now.toISOString();
    return {
      id: v4() as string & tags.Format<"uuid">,
      total_view_count: 0,
      unique_viewer_count: 0,
      last_viewed_at: null,
      average_time_spent_seconds: null,
      total_time_spent_seconds: 0,
      created_at: currentTimestamp as string & tags.Format<"date-time">,
      updated_at: currentTimestamp as string & tags.Format<"date-time">,
    } satisfies IDiscussionBoardArticleViewStatEvent;
  }
  // Transform and return using transformer
  return await DiscussionBoardArticleViewStatEventTransformer.transform(stats);
}
