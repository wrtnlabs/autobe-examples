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

export async function test_api_article_search_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create first user
  const userConnection1: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(userConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: "Test User 1",
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user1);
  // Create second user
  const userConnection2: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(userConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: "Test User 2",
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user2);
  // Create multiple articles with varied content for testing
  const articles: IDiscussionBoardArticle[] = [];
  // Create articles with different content patterns for search testing
  // User1 articles with "technology" theme
  const techArticle1 =
    await generate_random_discussion_board_user_articles_create(
      userConnection1,
      {
        body: {
          title: "Latest Technology Trends in 2024",
          content:
            "Artificial intelligence and machine learning are transforming industries worldwide with innovative applications that revolutionize how we work and live.",
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(techArticle1);
  articles.push(techArticle1);
  const techArticle2 =
    await generate_random_discussion_board_user_articles_create(
      userConnection1,
      {
        body: {
          title: "Cloud Computing Advancements",
          content:
            "Modern cloud platforms provide scalable solutions for businesses seeking digital transformation through distributed computing architectures.",
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(techArticle2);
  articles.push(techArticle2);
  // User2 articles with "business" theme
  const businessArticle1 =
    await generate_random_discussion_board_user_articles_create(
      userConnection2,
      {
        body: {
          title: "Business Strategy for Startups",
          content:
            "Effective business planning requires thorough market analysis and strategic positioning to achieve sustainable growth and competitive advantage.",
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(businessArticle1);
  articles.push(businessArticle1);
  const businessArticle2 =
    await generate_random_discussion_board_user_articles_create(
      userConnection2,
      {
        body: {
          title: "Digital Marketing Techniques",
          content:
            "Modern marketing strategies leverage data analytics and customer insights to optimize campaign performance and maximize return on investment.",
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(businessArticle2);
  articles.push(businessArticle2);
  // Additional articles for more varied testing
  const additionalArticle =
    await generate_random_discussion_board_user_articles_create(
      userConnection1,
      {
        body: {
          title: "Sustainable Development Goals",
          content:
            "Global initiatives focus on environmental protection and social equity through coordinated international cooperation and policy implementation.",
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(additionalArticle);
  articles.push(additionalArticle);
  // Wait a moment to ensure articles are properly indexed
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // Test 1: Author filtering
  const user1Results = await api.functional.discussionBoard.user.articles.index(
    userConnection1,
    {
      body: {
        discussion_board_user_id: user1.id,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(user1Results);
  // Validate that results belong to user1
  TestValidator.predicate(
    "author filter should return only user1 articles",
    user1Results.data.every((article) => article.author.id === user1.id),
  );
  // Test 2: Text search in title (partial matching)
  const titleSearchResults =
    await api.functional.discussionBoard.user.articles.index(userConnection1, {
      body: {
        title: "Technology",
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(titleSearchResults);
  // Validate that search found relevant articles
  TestValidator.predicate(
    "title search should find technology-related articles",
    titleSearchResults.data.length > 0,
  );
  TestValidator.predicate(
    "title search results should contain search term",
    titleSearchResults.data.every((article) =>
      article.title.toLowerCase().includes("technology"),
    ),
  );
  // Test 3: Text search in content (partial matching)
  const contentSearchResults =
    await api.functional.discussionBoard.user.articles.index(userConnection1, {
      body: {
        content: "business",
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(contentSearchResults);
  // Validate that search found relevant articles
  TestValidator.predicate(
    "content search should find business-related articles",
    contentSearchResults.data.length > 0,
  );
  // Test 4: Combined author and text search
  const combinedSearchResults =
    await api.functional.discussionBoard.user.articles.index(userConnection1, {
      body: {
        discussion_board_user_id: user1.id,
        title: "Technology",
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(combinedSearchResults);
  // Validate combined filter results
  TestValidator.predicate(
    "combined filter should return user1's technology articles",
    combinedSearchResults.data.every(
      (article) =>
        article.author.id === user1.id &&
        article.title.toLowerCase().includes("technology"),
    ),
  );
  // Test 5: Empty search returns all articles (with reasonable limit)
  const allResults = await api.functional.discussionBoard.user.articles.index(
    userConnection1,
    {
      body: {
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(allResults);
  TestValidator.predicate(
    "empty search should return articles",
    allResults.data.length > 0,
  );
  // Test 6: Search with no results
  const noResults = await api.functional.discussionBoard.user.articles.index(
    userConnection1,
    {
      body: {
        title: "NonexistentSearchTermXYZ123",
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(noResults);
  TestValidator.equals(
    "search for nonexistent term should return empty results",
    noResults.data.length,
    0,
  );
}
