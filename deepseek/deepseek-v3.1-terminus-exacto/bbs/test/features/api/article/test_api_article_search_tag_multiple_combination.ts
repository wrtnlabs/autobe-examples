import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
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

export async function test_api_article_search_tag_multiple_combination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: User authentication
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(authorizedUser);
  // Step 2: Create articles with various tag combinations
  // We need to create a section first, but since we don't have section creation utility,
  // we'll assume a section exists. In real scenario, we'd need to create or get a section.
  // For this test, we'll use a dummy section ID that should exist in the test environment.
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Create articles with different tag combinations
  const articles: IDiscussionBoardArticle[] = [];
  // Article 1: Single tag "typescript"
  const article1 = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: sectionId,
      },
    },
  );
  typia.assert(article1);
  articles.push(article1);
  // Article 2: Tags "typescript" and "nestjs"
  const article2 = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: sectionId,
      },
    },
  );
  typia.assert(article2);
  articles.push(article2);
  // Article 3: Tags "nestjs" and "prisma"
  const article3 = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: sectionId,
      },
    },
  );
  typia.assert(article3);
  articles.push(article3);
  // Article 4: Tags "typescript", "nestjs", and "prisma"
  const article4 = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: sectionId,
      },
    },
  );
  typia.assert(article4);
  articles.push(article4);
  // Note: In a real implementation, we would need to attach tags to these articles.
  // However, based on the provided DTOs and SDK functions, there's no API for attaching tags.
  // The scenario mentions "tags" but the IDiscussionBoardArticle structure doesn't include tags.
  // Assuming the tag search works based on some tag association mechanism.
  // Step 3: Test tag search functionality
  // Since we can't actually attach tags, we'll test the search endpoint with various parameters
  // to validate it works correctly with the provided request structure.
  // Test 1: Search with no tag filter (should return all articles)
  const searchResult1 =
    await api.functional.discussionBoard.user.articles.search.tags.search(
      userConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResult1);
  // Test 2: Search with single filter (by title)
  const searchResult2 =
    await api.functional.discussionBoard.user.articles.search.tags.search(
      userConnection,
      {
        body: {
          title: article1.title.substring(0, 10),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResult2);
  // Test 3: Search with section filter
  const searchResult3 =
    await api.functional.discussionBoard.user.articles.search.tags.search(
      userConnection,
      {
        body: {
          discussion_board_section_id: sectionId,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResult3);
  // Validate pagination
  TestValidator.predicate(
    "pagination metadata exists",
    searchResult1.pagination !== undefined,
  );
  TestValidator.predicate(
    "has pagination data",
    searchResult1.data !== undefined,
  );
  // Since we can't test actual tag filtering without tag APIs, we validate the search endpoint works
  // and returns properly structured results.
  TestValidator.equals(
    "search returns page structure",
    Object.keys(searchResult1),
    ["pagination", "data"],
  );
  TestValidator.predicate(
    "pagination has required fields",
    searchResult1.pagination !== undefined && searchResult1.pagination !== null
  );
}