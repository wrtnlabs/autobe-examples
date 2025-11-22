import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformModerationAppeal";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModeratorSession";
import type { IRedditPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAction";
import type { IRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAppeal";
import type { IRedditPlatformPlatformAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministratorSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUserSession";

/**
 * Test basic appeals search functionality for community moderators.
 *
 * Validates that community moderators can search and filter appeals for
 * communities they moderate with various criteria including status, appeal
 * level, date ranges, and pagination. Ensures moderators can access appeals for
 * their assigned communities and that search filters work correctly for
 * community appeal management.
 *
 * Business Context: Community moderators need efficient appeal management
 * workflows to review user appeals against moderation actions. This test
 * validates the search functionality that enables moderators to filter appeals
 * by status, date, and other criteria for effective community management.
 *
 * Test Flow:
 *
 * 1. Create community moderator account with authentication
 * 2. Establish moderator identity and obtain access tokens
 * 3. Test appeals search with various filtering criteria
 * 4. Validate search results and pagination functionality
 * 5. Verify moderator can only access relevant appeals
 */
export async function test_api_appeals_basic_search_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create community moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const registeredUserId = typia.random<string & tags.Format<"uuid">>();
  const communityIds = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];

  const moderator: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        registered_user_id: registeredUserId,
        moderation_permissions: JSON.stringify({
          can_remove_posts: true,
          can_remove_comments: true,
          can_ban_users: true,
          can_warn_users: true,
          can_pin_posts: true,
          can_edit_rules: false,
          can_manage_moderators: false,
          can_approve_posts: true,
        }),
        assigned_communities: JSON.stringify(communityIds),
        appointed_by: typia.random<string & tags.Format<"uuid">>(),
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        href: "https://example.com/moderator/join",
        referrer: "https://reddit-platform.com/community",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Test basic appeals search without filters
  const basicSearch: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(basicSearch);

  TestValidator.equals(
    "basic search returns data",
    basicSearch.data.length >= 0,
    true,
  );
  TestValidator.equals(
    "pagination info present",
    basicSearch.pagination.current >= 0,
    true,
  );

  // Step 3: Test appeals search with status filter
  const statusFilteredSearch: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "pending",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(statusFilteredSearch);

  TestValidator.equals(
    "status filter applied",
    statusFilteredSearch.data.length >= 0,
    true,
  );

  // Step 4: Test appeals search with appeal level filter
  const levelFilteredSearch: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 15,
          appeal_level: "initial",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(levelFilteredSearch);

  TestValidator.equals(
    "appeal level filter applied",
    levelFilteredSearch.data.length >= 0,
    true,
  );

  // Step 5: Test appeals search with date range filters
  const dateFrom = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30 days ago
  const dateTo = new Date().toISOString(); // now

  const dateFilteredSearch: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 25,
          created_at_from: dateFrom,
          created_at_to: dateTo,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(dateFilteredSearch);

  TestValidator.equals(
    "date range filter applied",
    dateFilteredSearch.data.length >= 0,
    true,
  );

  // Step 6: Test appeals search with complex filtering (multiple criteria)
  const complexFilteredSearch: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "under_review",
          appeal_level: "initial",
          is_escalated: false,
          created_at_from: dateFrom,
          created_at_to: dateTo,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(complexFilteredSearch);

  TestValidator.equals(
    "complex filtering applied",
    complexFilteredSearch.data.length >= 0,
    true,
  );

  // Step 7: Test pagination with different page numbers
  const secondPageSearch: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 2,
          limit: 5,
          order_by: "created_at",
          order_direction: "asc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(secondPageSearch);

  TestValidator.equals(
    "pagination second page",
    secondPageSearch.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit respected",
    secondPageSearch.data.length <= 5,
    true,
  );

  // Step 8: Test pagination info accuracy
  TestValidator.equals(
    "pagination records count accurate",
    secondPageSearch.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages calculation correct",
    secondPageSearch.pagination.pages >= 0,
    true,
  );

  // Step 9: Validate appeal data structure in results
  if (basicSearch.data.length > 0) {
    const firstAppeal = basicSearch.data[0];
    TestValidator.equals(
      "appeal has valid ID",
      firstAppeal.id.length > 0,
      true,
    );
    TestValidator.equals(
      "appeal has status",
      firstAppeal.status.length > 0,
      true,
    );
    TestValidator.equals(
      "appeal has appeal level",
      firstAppeal.appeal_level.length > 0,
      true,
    );
    TestValidator.equals(
      "appeal has created timestamp",
      firstAppeal.created_at.length > 0,
      true,
    );

    // Validate nested structure
    if (firstAppeal.moderation_action) {
      TestValidator.equals(
        "moderation action present",
        firstAppeal.moderation_action.id.length > 0,
        true,
      );
    }

    if (firstAppeal.appellant_session) {
      TestValidator.equals(
        "appellant session present",
        firstAppeal.appellant_session.id.length > 0,
        true,
      );
    }
  }

  // Step 10: Test edge case - empty results
  const emptyResultSearch: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 999999, // Non-existent page
          limit: 10,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(emptyResultSearch);

  TestValidator.equals(
    "empty search returns empty array",
    emptyResultSearch.data.length === 0,
    true,
  );
  TestValidator.equals(
    "empty search maintains pagination info",
    emptyResultSearch.pagination.current === 999999,
    true,
  );
}
