import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStatEvent";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleViewStatEvent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_view_stat_events_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Since sections are managed by administrators and we don't have admin utilities,
  // we'll use a randomly generated UUID for section_id. In a real scenario, this
  // would require proper section creation by an administrator.
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Create an article to generate view statistic events
  // Note: In a complete implementation, we would need to create a section first
  // via administrator functions, but for this basic test we'll use a random UUID
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Retrieve view statistic events for the created article
  const viewStatEvents =
    await api.functional.discussionBoard.articles.view_stat_events.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
      },
    );
  typia.assert(viewStatEvents);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure exists",
    typeof viewStatEvents.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page is 1",
    viewStatEvents.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is correct",
    viewStatEvents.pagination.limit === 10,
  );
  TestValidator.predicate(
    "records count is non-negative",
    viewStatEvents.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    viewStatEvents.pagination.pages >= 0,
  );
  // Validate view event data structure
  if (viewStatEvents.data.length > 0) {
    const event = viewStatEvents.data[0];
    TestValidator.predicate("event has valid UUID", event.id.length > 0);
    TestValidator.predicate(
      "event has creation timestamp",
      event.created_at.length > 0,
    );
    // Validate article reference matches the created article
    TestValidator.equals("article ID matches", event.article?.id, article.id);
    TestValidator.equals(
      "article title matches",
      event.article?.title,
      article.title,
    );
    // Validate optional fields
    if (
      event.view_duration_seconds !== null &&
      event.view_duration_seconds !== undefined
    ) {
      TestValidator.predicate(
        "view duration is non-negative",
        event.view_duration_seconds >= 0,
      );
    }
    if (event.userSession !== null && event.userSession !== undefined) {
      TestValidator.predicate(
        "user session has valid structure",
        typeof event.userSession.id === "string",
      );
    }
  }
  // Test that filtering by article ID works correctly
  TestValidator.predicate(
    "all events belong to the target article",
    viewStatEvents.data.every((event) => event.article?.id === article.id),
  );
}
