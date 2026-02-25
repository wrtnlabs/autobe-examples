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

export async function test_api_article_view_tracking_authenticated_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user account and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(authorizedUser);
  // 2. Login user to establish session
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedInUser = await authorize_user_login(loginConnection, {
    body: {
      email: authorizedUser.email,
      password: "test1234",
    } satisfies IDiscussionBoardUser.ILogin,
  });
  typia.assert(loggedInUser);
  // Create authenticated connection with session token
  const authConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: loggedInUser.token.access },
  };
  // 3. Create an article for tracking views
  const article = await generate_random_discussion_board_user_articles_create(
    authConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 10,
          wordMax: 20,
        }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 4. Create multiple view events with session tracking
  const sessionId1 = typia.random<string & tags.Format<"uuid">>();
  const sessionId2 = typia.random<string & tags.Format<"uuid">>();
  // First view event - short duration with session 1
  const viewEvent1 =
    await generate_random_discussion_board_articles_view_stat_events_create(
      authConnection,
      {
        params: { articleId: article.id },
        body: {
          view_duration_seconds: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<30> & tags.Maximum<60>
          >(),
          discussion_board_user_session_id: sessionId1,
        } satisfies IDiscussionBoardArticleViewStatEvent.ICreate,
      },
    );
  typia.assert(viewEvent1);
  // Second view event - longer duration with different session (simulating repeated visit)
  const viewEvent2 =
    await generate_random_discussion_board_articles_view_stat_events_create(
      authConnection,
      {
        params: { articleId: article.id },
        body: {
          view_duration_seconds: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<120> & tags.Maximum<300>
          >(),
          discussion_board_user_session_id: sessionId2,
        } satisfies IDiscussionBoardArticleViewStatEvent.ICreate,
      },
    );
  typia.assert(viewEvent2);
  // Third view event - no session (anonymous view)
  const viewEvent3 =
    await generate_random_discussion_board_articles_view_stat_events_create(
      authConnection,
      {
        params: { articleId: article.id },
        body: {
          view_duration_seconds: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<15> & tags.Maximum<45>
          >(),
          discussion_board_user_session_id: null,
        } satisfies IDiscussionBoardArticleViewStatEvent.ICreate,
      },
    );
  typia.assert(viewEvent3);
  // 5. Validate business logic - view metrics should accumulate
  TestValidator.predicate(
    "total time spent increases with additional views",
    viewEvent3.total_time_spent_seconds > viewEvent1.total_time_spent_seconds,
  );
  TestValidator.predicate(
    "total view count increases with additional views",
    viewEvent3.total_view_count > viewEvent1.total_view_count,
  );
  TestValidator.predicate(
    "unique viewer count should reflect sessions",
    viewEvent3.unique_viewer_count >= 1,
  );
  TestValidator.predicate(
    "last viewed timestamp should be updated",
    viewEvent3.last_viewed_at !== null,
  );
}
