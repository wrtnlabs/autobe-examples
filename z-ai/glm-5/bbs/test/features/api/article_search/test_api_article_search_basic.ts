import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
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
import { generate_random_discussion_board_user_sections_create } from "../../../generate/generate_random_discussion_board_user_sections_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_article_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user-specific connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a section for organizing test articles
  const section = await generate_random_discussion_board_user_sections_create(
    userConnection,
    {
      body: {
        name: `Economic Discussion ${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(section);
  // 3. Create first test article with 'economic' in the title
  const article1 = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: `Economic Policy Analysis - ${RandomGenerator.paragraph({ sentences: 1 })}`,
        content: RandomGenerator.content({ paragraphs: 3 }),
        sectionId: section.id,
      },
    },
  );
  typia.assert(article1);
  // 4. Create second test article with 'economic' in the content
  const article2 = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: `This article discusses economic trends and market dynamics. ${RandomGenerator.content({ paragraphs: 2 })}`,
        sectionId: section.id,
      },
    },
  );
  typia.assert(article2);
  // 5. Wait briefly to ensure articles are indexed
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 6. Execute search with query 'economic' and sort 'newest'
  const searchResult = await api.functional.discussionBoard.articles.search(
    connection,
    {
      body: {
        search: "economic",
        sort: "newest",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchResult);
  // 7. Validate pagination structure
  TestValidator.predicate(
    "pagination should have current page",
    searchResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination should have limit",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should have records count",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have pages count",
    searchResult.pagination.pages >= 0,
  );
  // 8. Validate response data structure
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(searchResult.data),
  );
  // 9. Verify each article has required fields
  for (const article of searchResult.data) {
    TestValidator.predicate("article should have id", article.id !== undefined);
    TestValidator.predicate(
      "article should have title",
      article.title !== undefined,
    );
    TestValidator.predicate(
      "article should have author",
      article.author !== undefined,
    );
    TestValidator.predicate(
      "article should have section",
      article.section !== undefined,
    );
    TestValidator.predicate(
      "article should have tags array",
      Array.isArray(article.tags),
    );
    TestValidator.predicate(
      "article should have comments_count",
      article.comments_count !== undefined,
    );
    TestValidator.predicate(
      "article should have created_at",
      article.created_at !== undefined,
    );
  }
  // 10. Verify results are sorted by created_at in descending order (newest first)
  if (searchResult.data.length > 1) {
    for (let i = 0; i < searchResult.data.length - 1; i++) {
      const currentCreatedAt = new Date(searchResult.data[i].created_at);
      const nextCreatedAt = new Date(searchResult.data[i + 1].created_at);
      TestValidator.predicate(
        "articles should be sorted by created_at descending (newest first)",
        currentCreatedAt >= nextCreatedAt,
      );
    }
  }
  // 11. Verify created test articles are found in search results
  const foundArticle1 = searchResult.data.find((a) => a.id === article1.id);
  const foundArticle2 = searchResult.data.find((a) => a.id === article2.id);
  TestValidator.predicate(
    "first article with economic in title should be found",
    foundArticle1 !== undefined,
  );
  TestValidator.predicate(
    "second article with economic in content should be found",
    foundArticle2 !== undefined,
  );
}
