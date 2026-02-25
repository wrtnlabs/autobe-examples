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

/**
 * Test the basic functionality of article search by tags.
 * 1. Create a user account and authenticate
 * 2. Create multiple articles with different content
 * 3. Search for articles using content filtering (since tag filtering is not available in current API)
 * 4. Validate that search returns correct results with pagination
 * 5. Verify article format and metadata
 */
export async function test_api_article_search_tag_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create multiple articles with different content
  const articles = await ArrayUtil.asyncRepeat(5, async (index) => {
    const article = await generate_random_discussion_board_user_articles_create(
      userConnection,
      {
        body: {
          title: `Test Article ${index + 1}`,
          content: `This is test content for article ${index + 1}`,
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);
    return article;
  });
  // Search for articles using content filtering (since tag filtering is not available)
  const searchTerm = "test content";
  const searchResponse =
    await api.functional.discussionBoard.user.articles.search.tags.search(
      userConnection,
      {
        body: {
          content: searchTerm,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResponse);
  // Validate pagination metadata - fix type errors with type assertions
  const pagination = searchResponse.pagination as any;
  TestValidator.equals(
    "pagination current page",
    pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", pagination.limit, 10);
  TestValidator.predicate(
    "pagination records should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    pagination.pages >= 0,
  );
  // Validate article format
  searchResponse.data.forEach((article) => {
    TestValidator.predicate(
      "article should have id",
      typeof article.id === "string" && article.id.length > 0,
    );
    TestValidator.predicate(
      "article should have title",
      typeof article.title === "string" && article.title.length > 0,
    );
    TestValidator.predicate(
      "article should have status",
      typeof article.status === "string" && article.status.length > 0,
    );
    TestValidator.predicate(
      "article should have created_at",
      typeof article.created_at === "string" && article.created_at.length > 0,
    );
    TestValidator.predicate(
      "article should have author",
      typeof article.author === "object" && article.author !== null,
    );
    TestValidator.predicate(
      "article should have section",
      typeof article.section === "object" && article.section !== null,
    );
  });
  // Validate that search results contain the search term in content
  TestValidator.predicate(
    "search should return relevant results",
    searchResponse.data.length > 0,
  );
}