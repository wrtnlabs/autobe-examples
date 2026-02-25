import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStatEvent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_discussion_board_articles_view_stat_events_create } from "../../../generate/generate_random_discussion_board_articles_view_stat_events_create";
import { prepare_random_discussion_board_article_view_stat_event } from "../../../prepare/prepare_random_discussion_board_article_view_stat_event";

/**
 * Test article view tracking for non-existent article.
 *
 * This test validates that the system properly handles attempts to create
 * view statistic events for articles that do not exist. It ensures that
 * the API returns a 404 Not Found error rather than creating invalid records,
 * maintaining referential integrity in the analytics system.
 */
export async function test_api_article_view_tracking_nonexistent_article(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that doesn't correspond to any existing article
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();
  // Prepare valid view event data
  const body = {
    view_duration_seconds: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<300>
    >(),
    discussion_board_user_session_id: typia.random<
      (string & tags.Format<"uuid">) | null | undefined
    >(),
  } satisfies IDiscussionBoardArticleViewStatEvent.ICreate;
  // Attempt to create view stat event for non-existent article
  await TestValidator.error(
    "non-existent article should return 404",
    async () => {
      await api.functional.discussionBoard.articles.view_stat_events.create(
        connection,
        {
          articleId: nonExistentArticleId,
          body,
        },
      );
    },
  );
}
