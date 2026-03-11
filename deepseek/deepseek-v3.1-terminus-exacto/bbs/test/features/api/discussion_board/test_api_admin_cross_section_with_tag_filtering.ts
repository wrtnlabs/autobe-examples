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
 * Test that administrators can filter cross-section search results by specific tags.
 * Create multiple articles across different sections with various tags (e.g., 'election', 'inflation', 'climate').
 * Authenticate as admin and search using tag filtering parameters. Validate that only articles with matching tags
 * are returned, regardless of which section they belong to. Verify that tag usage counts are accurate in the
 * response and that articles maintain their section context. Test edge cases: searching for tags that don't exist
 * (should return empty results), articles with multiple tags (should appear in both tag searches), and
 * case-insensitive tag matching.
 */
export async function test_api_admin_cross_section_with_tag_filtering(
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
  // Create sections
  const politicsSection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: "Politics",
          description: "Political discussions and debates",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(politicsSection);
  const economySection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: "Economy",
          description: "Economic discussions and analysis",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(economySection);
  const currentAffairsSection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: "Current Affairs",
          description: "Current events and news discussions",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(currentAffairsSection);
  // Create member connection
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
  // Create articles with specific content that will be used for text search
  const electionArticle =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "Election Coverage 2024",
          body: "Comprehensive coverage of the 2024 presidential election with analysis of key battleground states and voter trends.",
          discussion_board_section_id: politicsSection.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(electionArticle);
  const inflationArticle =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "Inflation Analysis and Economic Impact",
          body: "Detailed analysis of current inflation rates and their impact on consumer spending and economic growth.",
          discussion_board_section_id: economySection.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(inflationArticle);
  const climateElectionArticle =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "Climate Change and Election Policies",
          body: "Examining how climate change policies are shaping election campaigns and voter preferences across different regions.",
          discussion_board_section_id: currentAffairsSection.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(climateElectionArticle);
  // Wait a moment for articles to be indexed
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Test cross-section search with text filtering (since tag filtering API is not available)
  // Search for 'election' term - should return electionArticle and climateElectionArticle
  const electionSearch =
    await api.functional.discussionBoard.admin.cross_section.index(
      adminConnection,
      {
        body: {
          search: "election",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(electionSearch);
  // Search for 'inflation' term - should return only inflationArticle
  const inflationSearch =
    await api.functional.discussionBoard.admin.cross_section.index(
      adminConnection,
      {
        body: {
          search: "inflation",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(inflationSearch);
  // Search for 'climate' term - should return only climateElectionArticle
  const climateSearch =
    await api.functional.discussionBoard.admin.cross_section.index(
      adminConnection,
      {
        body: {
          search: "climate",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(climateSearch);
  // Search for non-existent term - should return empty results
  const nonexistentSearch =
    await api.functional.discussionBoard.admin.cross_section.index(
      adminConnection,
      {
        body: {
          search: "nonexistentterm12345",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(nonexistentSearch);
  // Validate search results
  TestValidator.predicate(
    "election search should return articles containing election term",
    electionSearch.data.length >= 1,
  );
  TestValidator.predicate(
    "inflation search should return articles containing inflation term",
    inflationSearch.data.length >= 1,
  );
  TestValidator.predicate(
    "climate search should return articles containing climate term",
    climateSearch.data.length >= 1,
  );
  TestValidator.equals(
    "non-existent term search should return empty results",
    nonexistentSearch.data.length,
    0,
  );
  // Validate pagination metadata
  TestValidator.predicate(
    "search results should have valid pagination",
    electionSearch.pagination.records >= 0 &&
      electionSearch.pagination.pages >= 0 &&
      electionSearch.pagination.limit > 0,
  );
  // Validate article structure
  if (electionSearch.data.length > 0) {
    const article = electionSearch.data[0]!;
    TestValidator.predicate(
      "article should have valid ID",
      typeof article.id === "string" && article.id.length > 0,
    );
    TestValidator.predicate(
      "article should have title",
      typeof article.title === "string" && article.title.length > 0,
    );
    TestValidator.predicate(
      "article should have author information",
      typeof article.author.id === "string" &&
        typeof article.author.display_name === "string",
    );
    TestValidator.predicate(
      "article should have section information",
      typeof article.section.id === "string" &&
        typeof article.section.name === "string",
    );
    TestValidator.predicate(
      "article should have tags array",
      Array.isArray(article.tags),
    );
    TestValidator.predicate(
      "article should have comments count",
      typeof article.comments_count === "number" && article.comments_count >= 0,
    );
    TestValidator.predicate(
      "article should have creation timestamp",
      typeof article.created_at === "string" && article.created_at.length > 0,
    );
  }
}
