import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
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

export async function test_api_article_search_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create first user and articles
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user1);
  // Generate a random section ID for testing
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Create articles with different statuses
  const publishedArticle1 =
    await generate_random_discussion_board_user_articles_create(
      user1Connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          section_id: sectionId,
          status: "published",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(publishedArticle1);
  const draftArticle1 =
    await generate_random_discussion_board_user_articles_create(
      user1Connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          section_id: sectionId,
          status: "draft",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(draftArticle1);
  // Create second user and articles
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user2);
  const publishedArticle2 =
    await generate_random_discussion_board_user_articles_create(
      user2Connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          section_id: sectionId,
          status: "published",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(publishedArticle2);
  const archivedArticle2 =
    await generate_random_discussion_board_user_articles_create(
      user2Connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          section_id: sectionId,
          status: "archived",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(archivedArticle2);
  // Test individual filtering capabilities
  // Test status filtering
  const publishedResults =
    await api.functional.discussionBoard.user.articles.index(user1Connection, {
      body: {
        status: "published",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(publishedResults);
  TestValidator.predicate(
    "published articles should include published status only",
    publishedResults.data.every((article) => article.status === "published"),
  );
  const draftResults = await api.functional.discussionBoard.user.articles.index(
    user1Connection,
    {
      body: {
        status: "draft",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(draftResults);
  TestValidator.predicate(
    "draft articles should include draft status only",
    draftResults.data.every((article) => article.status === "draft"),
  );
  // Test author filtering
  const authorResults =
    await api.functional.discussionBoard.user.articles.index(user1Connection, {
      body: {
        author_id: user1.id,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(authorResults);
  TestValidator.predicate(
    "author-filtered articles should belong to specified author",
    authorResults.data.every((article) => article.author.id === user1.id),
  );
  // Test date range filtering
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const dateRangeResults =
    await api.functional.discussionBoard.user.articles.index(user1Connection, {
      body: {
        created_after: yesterday,
        created_before: tomorrow,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(dateRangeResults);
  // Test combined filtering
  const combinedResults =
    await api.functional.discussionBoard.user.articles.index(user1Connection, {
      body: {
        author_id: user1.id,
        status: "published",
        created_after: yesterday,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(combinedResults);
  TestValidator.predicate(
    "combined filter results should match all criteria",
    combinedResults.data.every(
      (article) =>
        article.author.id === user1.id &&
        article.status === "published" &&
        new Date(article.created_at) >= new Date(yesterday),
    ),
  );
}
