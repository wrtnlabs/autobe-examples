import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleDraft";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_drafts_create } from "../../../generate/generate_random_discussion_board_admin_articles_drafts_create";
import { prepare_random_discussion_board_article_draft } from "../../../prepare/prepare_random_discussion_board_article_draft";

/**
 * Comprehensive test for article draft search filtering capabilities.
 * Tests text search, status filtering, date range filters, AND logic, pagination, and edge cases.
 */
export async function test_api_article_draft_search_comprehensive_filters(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Step 2: Create test drafts with specific characteristics
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  // Draft 1: Contains 'budget analysis' in title, draft status, recent dates
  const draft1 =
    await generate_random_discussion_board_admin_articles_drafts_create(
      adminConnection,
      {
        body: {
          draft_title: "Annual budget analysis for Q4",
          draft_content: RandomGenerator.paragraph({ sentences: 3 }),
          draft_status: "draft",
        },
      },
    );
  typia.assert(draft1);
  // Draft 2: Contains 'economic forecast' in content, draft status, older dates
  const draft2 =
    await generate_random_discussion_board_admin_articles_drafts_create(
      adminConnection,
      {
        body: {
          draft_title: RandomGenerator.paragraph({ sentences: 2 }),
          draft_content: "The economic forecast shows steady growth",
          draft_status: "draft",
        },
      },
    );
  typia.assert(draft2);
  // Draft 3: Published status (for negative testing)
  const draft3 =
    await generate_random_discussion_board_admin_articles_drafts_create(
      adminConnection,
      {
        body: {
          draft_title: RandomGenerator.paragraph({ sentences: 2 }),
          draft_content: RandomGenerator.paragraph({ sentences: 3 }),
          draft_status: "published",
        },
      },
    );
  typia.assert(draft3);
  // Draft 4: Create as draft first, then update to archived (to test PUT endpoint)
  const draft4 =
    await generate_random_discussion_board_admin_articles_drafts_create(
      adminConnection,
      {
        body: {
          draft_title: RandomGenerator.paragraph({ sentences: 2 }),
          draft_content: RandomGenerator.paragraph({ sentences: 3 }),
          draft_status: "draft",
        },
      },
    );
  typia.assert(draft4);
  // Update draft4 to archived status using PUT endpoint
  await api.functional.discussionBoard.admin.articles_drafts.update(
    adminConnection,
    {
      draftId: draft4.id,
      body: {
        draft_status: "archived",
      },
    },
  );
  // Step 3: Test comprehensive filtering with AND logic
  const searchResult =
    await api.functional.discussionBoard.admin.articles_drafts.own.index(
      adminConnection,
      {
        body: {
          search_title: "budget",
          search_content: "forecast",
          status: "draft",
          last_saved_at_from: twoDaysAgo.toISOString(),
          last_saved_at_to: tomorrow.toISOString(),
          draft_created_at_from: twoDaysAgo.toISOString(),
          draft_created_at_to: tomorrow.toISOString(),
          draft_updated_at_from: twoDaysAgo.toISOString(),
          draft_updated_at_to: tomorrow.toISOString(),
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(searchResult);
  // Step 4: Verify search results
  TestValidator.equals(
    "search should return empty due to AND logic (no draft matches both title and content)",
    searchResult.data.length,
    0,
  );
  // Step 5: Test individual filters
  // Test title search only
  const titleSearch =
    await api.functional.discussionBoard.admin.articles_drafts.own.index(
      adminConnection,
      {
        body: {
          search_title: "budget",
          status: "draft",
        },
      },
    );
  typia.assert(titleSearch);
  TestValidator.predicate(
    "title search should find draft1",
    titleSearch.data.some((d) => d.id === draft1.id),
  );
  // Test content search only
  const contentSearch =
    await api.functional.discussionBoard.admin.articles_drafts.own.index(
      adminConnection,
      {
        body: {
          search_content: "forecast",
          status: "draft",
        },
      },
    );
  typia.assert(contentSearch);
  TestValidator.predicate(
    "content search should find draft2",
    contentSearch.data.some((d) => d.id === draft2.id),
  );
  // Test status filtering
  const draftStatusSearch =
    await api.functional.discussionBoard.admin.articles_drafts.own.index(
      adminConnection,
      {
        body: {
          status: "draft",
        },
      },
    );
  typia.assert(draftStatusSearch);
  TestValidator.predicate(
    "draft status search should find draft1 and draft2 but not draft3 or archived draft4",
    draftStatusSearch.data.some((d) => d.id === draft1.id) &&
      draftStatusSearch.data.some((d) => d.id === draft2.id) &&
      !draftStatusSearch.data.some((d) => d.id === draft3.id) &&
      !draftStatusSearch.data.some((d) => d.id === draft4.id),
  );
  const publishedStatusSearch =
    await api.functional.discussionBoard.admin.articles_drafts.own.index(
      adminConnection,
      {
        body: {
          status: "published",
        },
      },
    );
  typia.assert(publishedStatusSearch);
  TestValidator.predicate(
    "published status search should find draft3",
    publishedStatusSearch.data.some((d) => d.id === draft3.id),
  );
  const archivedStatusSearch =
    await api.functional.discussionBoard.admin.articles_drafts.own.index(
      adminConnection,
      {
        body: {
          status: "archived",
        },
      },
    );
  typia.assert(archivedStatusSearch);
  TestValidator.predicate(
    "archived status search should find draft4",
    archivedStatusSearch.data.some((d) => d.id === draft4.id),
  );
  // Step 6: Test pagination boundary
  const paginationTest =
    await api.functional.discussionBoard.admin.articles_drafts.own.index(
      adminConnection,
      {
        body: {
          page: 100, // Page far exceeding total records
          limit: 10,
        },
      },
    );
  typia.assert(paginationTest);
  TestValidator.equals(
    "page exceeding total records should return empty data array",
    paginationTest.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination metadata should be valid with pagination structure",
    paginationTest.pagination !== undefined &&
      typeof paginationTest.pagination === "object" &&
      paginationTest.data.length === 0,
  );
  // Step 7: Test date range filters with null parameters
  const nullDateSearch =
    await api.functional.discussionBoard.admin.articles_drafts.own.index(
      adminConnection,
      {
        body: {
          status: "draft",
          // Explicitly undefined to test null handling
          last_saved_at_from: undefined,
          last_saved_at_to: undefined,
          draft_created_at_from: undefined,
          draft_created_at_to: undefined,
          draft_updated_at_from: undefined,
          draft_updated_at_to: undefined,
        },
      },
    );
  typia.assert(nullDateSearch);
  TestValidator.predicate(
    "null date parameters should return drafts without date filtering",
    nullDateSearch.data.some((d) => d.id === draft1.id) &&
      nullDateSearch.data.some((d) => d.id === draft2.id) &&
      !nullDateSearch.data.some((d) => d.id === draft3.id) &&
      !nullDateSearch.data.some((d) => d.id === draft4.id),
  );
  // Step 8: Verify all summaries have expected structure
  for (const summary of nullDateSearch.data) {
    typia.assert(summary);
    TestValidator.predicate(
      "summary should have valid id",
      typeof summary.id === "string" && summary.id.length > 0,
    );
    TestValidator.predicate(
      "summary should have draft_title",
      typeof summary.draft_title === "string",
    );
    TestValidator.predicate(
      "summary should have valid draft_status",
      typeof summary.draft_status === "string" &&
        ["draft", "published", "archived"].includes(summary.draft_status),
    );
    TestValidator.predicate(
      "summary should have timestamps",
      typeof summary.last_saved_at === "string" &&
        typeof summary.draft_created_at === "string" &&
        typeof summary.draft_updated_at === "string",
    );
  }
}