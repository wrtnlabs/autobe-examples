import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
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

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_drafts_create } from "../../../generate/generate_random_discussion_board_user_articles_drafts_create";
import { prepare_random_discussion_board_article_draft } from "../../../prepare/prepare_random_discussion_board_article_draft";

/**
 * Test article draft search with comprehensive filtering by status and dates.
 * Creates drafts with different statuses and creation dates, then validates
 * search functionality with status filters, date ranges, and text search.
 */
export async function test_api_article_draft_search_filter_by_status_and_dates(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  // Create specific test drafts with controlled parameters
  const draftDraft =
    await generate_random_discussion_board_user_articles_drafts_create(
      userConnection,
      {
        body: {
          draft_title: "Technology article about AI advancements",
          draft_content:
            "This article explores recent breakthroughs in artificial intelligence...",
          draft_status: "draft",
        },
      },
    );
  typia.assert(draftDraft);
  const publishedDraft =
    await generate_random_discussion_board_user_articles_drafts_create(
      userConnection,
      {
        body: {
          draft_title: "Science discoveries in quantum physics",
          draft_content:
            "Recent experiments have revealed new quantum phenomena...",
          draft_status: "published",
        },
      },
    );
  typia.assert(publishedDraft);
  const archivedDraft =
    await generate_random_discussion_board_user_articles_drafts_create(
      userConnection,
      {
        body: {
          draft_title: "Programming techniques for modern applications",
          draft_content:
            "Effective coding patterns and best practices for contemporary software development...",
          draft_status: "archived",
        },
      },
    );
  typia.assert(archivedDraft);
  // Test 1: Filter by status = "draft"
  const draftResults =
    await api.functional.discussionBoard.user.articles_drafts.own.index(
      userConnection,
      {
        body: {
          status: "draft",
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(draftResults);
  TestValidator.equals(
    "only draft status items",
    draftResults.data.filter((item) => item.draft_status === "draft").length,
    draftResults.data.length,
  );
  // Test 2: Filter by date range
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateResults =
    await api.functional.discussionBoard.user.articles_drafts.own.index(
      userConnection,
      {
        body: {
          draft_created_at_from: yesterday.toISOString(),
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(dateResults);
  TestValidator.predicate(
    "items from recent dates only",
    dateResults.data.every(
      (item) => new Date(item.draft_created_at) >= yesterday,
    ),
  );
  // Test 3: Filter by title search
  const searchResults =
    await api.functional.discussionBoard.user.articles_drafts.own.index(
      userConnection,
      {
        body: {
          search_title: "technology",
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(searchResults);
  TestValidator.predicate(
    "items contain search keyword",
    searchResults.data.every((item) =>
      item.draft_title.toLowerCase().includes("technology"),
    ),
  );
  // Test 4: Combined filter - draft status from yesterday with title search
  const combinedResults =
    await api.functional.discussionBoard.user.articles_drafts.own.index(
      userConnection,
      {
        body: {
          status: "draft",
          search_title: "technology",
          draft_created_at_from: yesterday.toISOString(),
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(combinedResults);
  TestValidator.predicate(
    "combined filter validates all conditions",
    combinedResults.data.every((item) => {
      const createdDate = new Date(item.draft_created_at);
      return (
        item.draft_status === "draft" &&
        item.draft_title.toLowerCase().includes("technology") &&
        createdDate >= yesterday
      );
    }),
  );
  // Test 5: Pagination validation
  const paginationResults =
    await api.functional.discussionBoard.user.articles_drafts.own.index(
      userConnection,
      {
        body: {
          limit: 2,
          page: 1,
        },
      },
    );
  typia.assert(paginationResults);
  TestValidator.equals(
    "pagination limit respected",
    paginationResults.data.length,
    2,
  );
  // Test 6: Verify DESC sorting by last_saved_at
  TestValidator.predicate("results sorted by last_saved_at DESC", () => {
    for (let i = 1; i < paginationResults.data.length; i++) {
      const current = new Date(paginationResults.data[i].last_saved_at);
      const previous = new Date(paginationResults.data[i - 1].last_saved_at);
      if (current > previous) return false;
    }
    return true;
  });
}
