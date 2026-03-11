import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test section-based filtering for administrative content browsing across categories.
 * As an admin, search for articles within specific discussion board sections to monitor
 * category-specific content. Create test sections first, then create articles in different
 * sections. Verify that filtering by discussion_board_section_id returns only articles
 * belonging to the specified section. Test edge cases: filtering with non-existent section
 * ID (should return empty results), filtering combined with keyword search (should return
 * matches within section only). Validate that section information is correctly included
 * in article summaries.
 */
export async function test_api_admin_discovery_section_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create two test sections with distinct names
  const section1 = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: "Politics",
        description: "Political discussions and debates",
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section1);
  const section2 = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: "Economy",
        description: "Economic analysis and financial discussions",
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section2);
  // Create member connection and articles
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Create articles in section 1 with distinct content
  const article1Title = "Government Policy Analysis";
  const article1 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: article1Title,
          body: "Comprehensive analysis of current government policies and their economic impact.",
          discussion_board_section_id: section1.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article1);
  const article2Title = "Election Campaign Strategies";
  const article2 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: article2Title,
          body: "Discussion of modern election campaign strategies and voter engagement techniques.",
          discussion_board_section_id: section1.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article2);
  // Create article in section 2 with distinct content
  const article3Title = "Stock Market Trends";
  const article3 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: article3Title,
          body: "Analysis of current stock market trends and investment opportunities.",
          discussion_board_section_id: section2.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article3);
  // Test filtering by section 1
  const section1Results =
    await api.functional.discussionBoard.admin.discovery.index(
      adminConnection,
      {
        body: {
          discussion_board_section_id: section1.id,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(section1Results);
  // Validate section 1 filtering
  TestValidator.equals(
    "section 1 filter returns correct number of articles",
    section1Results.data.length,
    2,
  );
  TestValidator.predicate(
    "section 1 filter includes article 1",
    section1Results.data.some((article) => article.id === article1.id),
  );
  TestValidator.predicate(
    "section 1 filter includes article 2",
    section1Results.data.some((article) => article.id === article2.id),
  );
  TestValidator.predicate(
    "section 1 filter excludes article 3",
    section1Results.data.every((article) => article.id !== article3.id),
  );
  // Test filtering by section 2
  const section2Results =
    await api.functional.discussionBoard.admin.discovery.index(
      adminConnection,
      {
        body: {
          discussion_board_section_id: section2.id,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(section2Results);
  // Validate section 2 filtering
  TestValidator.equals(
    "section 2 filter returns correct number of articles",
    section2Results.data.length,
    1,
  );
  TestValidator.predicate(
    "section 2 filter includes article 3",
    section2Results.data.some((article) => article.id === article3.id),
  );
  TestValidator.predicate(
    "section 2 filter excludes article 1",
    section2Results.data.every((article) => article.id !== article1.id),
  );
  // Test filtering with non-existent section ID
  const nonExistentSectionResults =
    await api.functional.discussionBoard.admin.discovery.index(
      adminConnection,
      {
        body: {
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(nonExistentSectionResults);
  // Validate non-existent section filtering
  TestValidator.equals(
    "non-existent section filter returns empty results",
    nonExistentSectionResults.data.length,
    0,
  );
  // Test filtering combined with keyword search using reliable keywords
  const combinedResults =
    await api.functional.discussionBoard.admin.discovery.index(
      adminConnection,
      {
        body: {
          search: "Policy",
          discussion_board_section_id: section1.id,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(combinedResults);
  // Validate combined filtering
  TestValidator.predicate(
    "combined filter returns articles matching keyword within section",
    combinedResults.data.length > 0 &&
      combinedResults.data.every(
        (article) => article.section.id === section1.id,
      ),
  );
  // Validate section information in article summaries
  section1Results.data.forEach((article, index) => {
    TestValidator.equals(
      `article ${index} has correct section ID`,
      article.section.id,
      section1.id,
    );
    TestValidator.equals(
      `article ${index} has correct section name`,
      article.section.name,
      section1.name,
    );
    TestValidator.predicate(
      `article ${index} has valid section description`,
      article.section.description !== undefined,
    );
  });
  // Test pagination with section filtering
  const paginatedResults =
    await api.functional.discussionBoard.admin.discovery.index(
      adminConnection,
      {
        body: {
          discussion_board_section_id: section1.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(paginatedResults);
  TestValidator.predicate(
    "pagination metadata is valid",
    paginatedResults.pagination.records >= 0 &&
      paginatedResults.pagination.pages >= 0 &&
      paginatedResults.pagination.current >= 0 &&
      paginatedResults.pagination.limit >= 0,
  );
}
