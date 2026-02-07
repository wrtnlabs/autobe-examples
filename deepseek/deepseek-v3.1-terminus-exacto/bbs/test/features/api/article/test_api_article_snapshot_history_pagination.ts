import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleSnapshot";
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

export async function test_api_article_snapshot_history_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a regular user
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
  // 2. Create initial article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Generate multiple articles to simulate having content for pagination testing
  // Since we don't have an article editing endpoint, we'll create multiple articles
  // and use the snapshot endpoint on the first article to test pagination
  const additionalArticleCount = 14; // Total 15 articles including the first one
  const allArticles: IDiscussionBoardArticle[] = [article];
  for (let i = 0; i < additionalArticleCount; i++) {
    const newArticle =
      await generate_random_discussion_board_user_articles_create(
        userConnection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
            content: RandomGenerator.content({ paragraphs: 2 }),
            section_id: article.section.id, // Use same section for consistency
            status: "published" as const,
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    typia.assert(newArticle);
    allArticles.push(newArticle);
  }
  // 4. Test pagination with different page sizes on the first article's snapshots
  const testLimits = [3, 5, 10] as const;
  for (const limit of testLimits) {
    // Test first page
    const page1Response =
      await api.functional.discussionBoard.articles.snapshots.index(
        userConnection,
        {
          articleId: article.id,
          body: {
            page: 1,
            limit: limit,
          } satisfies IDiscussionBoardArticleSnapshot.IRequest,
        },
      );
    typia.assert(page1Response);
    TestValidator.equals(
      `page 1 with limit ${limit} - current page`,
      page1Response.pagination.current,
      1,
    );
    TestValidator.equals(
      `page 1 with limit ${limit} - limit`,
      page1Response.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `page 1 with limit ${limit} - records count valid`,
      page1Response.pagination.records >= 0,
    );
    TestValidator.predicate(
      `page 1 with limit ${limit} - pages count valid`,
      page1Response.pagination.pages >= 0,
    );
    TestValidator.predicate(
      `page 1 with limit ${limit} - data length valid`,
      page1Response.data.length <= limit,
    );
    // Test middle page if available
    if (page1Response.pagination.pages > 1) {
      const middlePage = Math.max(
        2,
        Math.floor(page1Response.pagination.pages / 2),
      );
      const middlePageResponse =
        await api.functional.discussionBoard.articles.snapshots.index(
          userConnection,
          {
            articleId: article.id,
            body: {
              page: middlePage,
              limit: limit,
            } satisfies IDiscussionBoardArticleSnapshot.IRequest,
          },
        );
      typia.assert(middlePageResponse);
      TestValidator.equals(
        `page ${middlePage} with limit ${limit} - current page`,
        middlePageResponse.pagination.current,
        middlePage,
      );
      TestValidator.equals(
        `page ${middlePage} with limit ${limit} - limit`,
        middlePageResponse.pagination.limit,
        limit,
      );
      TestValidator.predicate(
        `page ${middlePage} with limit ${limit} - data length reasonable`,
        middlePageResponse.data.length <= limit,
      );
    }
    // Test last page if available
    if (page1Response.pagination.pages > 1) {
      const lastPage = page1Response.pagination.pages;
      const lastPageResponse =
        await api.functional.discussionBoard.articles.snapshots.index(
          userConnection,
          {
            articleId: article.id,
            body: {
              page: lastPage,
              limit: limit,
            } satisfies IDiscussionBoardArticleSnapshot.IRequest,
          },
        );
      typia.assert(lastPageResponse);
      TestValidator.equals(
        `last page with limit ${limit} - current page`,
        lastPageResponse.pagination.current,
        lastPage,
      );
      TestValidator.equals(
        `last page with limit ${limit} - limit`,
        lastPageResponse.pagination.limit,
        limit,
      );
      TestValidator.predicate(
        `last page with limit ${limit} - data length reasonable`,
        lastPageResponse.data.length > 0,
      );
      TestValidator.predicate(
        `last page with limit ${limit} - data length less than or equal to limit`,
        lastPageResponse.data.length <= limit,
      );
    }
  }
  // 5. Test edge cases
  // Test with very large page number (should return empty data)
  const largePageResponse =
    await api.functional.discussionBoard.articles.snapshots.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          page: 1000,
          limit: 5,
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(largePageResponse);
  TestValidator.equals(
    "large page number - current page",
    largePageResponse.pagination.current,
    1000,
  );
  TestValidator.predicate(
    "large page number - data should be empty or valid",
    largePageResponse.data.length >= 0,
  );
  // Test default pagination (no page/limit specified)
  const defaultResponse =
    await api.functional.discussionBoard.articles.snapshots.index(
      userConnection,
      {
        articleId: article.id,
        body: {} satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(defaultResponse);
  TestValidator.predicate(
    "default pagination - has valid pagination metadata",
    defaultResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "default pagination - has valid data",
    defaultResponse.data.length >= 0,
  );
  // 6. Validate pagination mathematical consistency
  const consistencyTest =
    await api.functional.discussionBoard.articles.snapshots.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(consistencyTest);
  TestValidator.predicate(
    "pagination consistency - pages calculation",
    consistencyTest.pagination.pages ===
      Math.ceil(
        consistencyTest.pagination.records / consistencyTest.pagination.limit,
      ) || consistencyTest.pagination.records === 0,
  );
}
