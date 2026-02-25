import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStatEvent";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_articles_view_stat_events_create } from "../../../generate/generate_random_discussion_board_articles_view_stat_events_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_view_stat_event } from "../../../prepare/prepare_random_discussion_board_article_view_stat_event";

/**
 * Test anonymous article view tracking event creation.
 * 1. Create a user account and article for a valid article ID
 * 2. Call the view stat events endpoint with view duration but without user session ID
 * 3. Verify the event is created successfully with expected structure
 */
export async function test_api_article_view_tracking_anonymous_visit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a user author
  const userConnection: api.IConnection = { host: connection.host };
  const author = await authorize_user_join(userConnection, {});
  typia.assert(author);
  // 2. Create an article to have a valid ID
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {},
  );
  typia.assert(article);
  // 3. Generate random view duration (1-300 seconds)
  const viewDuration = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<300>
  >();
  // 4. Create view stat event without user session ID (anonymous)
  const viewEvent =
    await api.functional.discussionBoard.articles.view_stat_events.create(
      connection, // using base connection (no auth) for anonymous request
      {
        articleId: article.id,
        body: {
          view_duration_seconds: viewDuration satisfies
            | (number & tags.Type<"int32">)
            | null
            | undefined as (number & tags.Type<"int32">) | null | undefined,
          // Explicitly omit discussion_board_user_session_id for anonymous
        } satisfies IDiscussionBoardArticleViewStatEvent.ICreate,
      },
    );
  typia.assert(viewEvent);
  // 5. Validate the response - business logic validation only, no type checks after typia.assert
  TestValidator.equals(
    "view duration matches input",
    viewEvent.total_time_spent_seconds,
    viewDuration,
  );
  // The response structure is already validated by typia.assert()
  // No authentication-related fields in the response DTO (IAuthorized not included)
}
