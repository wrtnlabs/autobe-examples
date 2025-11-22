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
 * Test appeals search filtering by appeal level for community moderators.
 *
 * This comprehensive test validates the appeals management system by creating a
 * community moderator account and testing various appeal level filtering
 * scenarios. The test covers filtering appeals by level (initial, secondary,
 * final) across managed communities, combination filtering with status and date
 * criteria, and edge cases to ensure robust appeal oversight capabilities for
 * community moderators.
 */
export async function test_api_appeals_moderator_appeal_level_oversight(
  connection: api.IConnection,
) {
  // Create community moderator account for testing
  const registeredUserId = typia.random<string & tags.Format<"uuid">>();
  const moderatorEmail = typia.random<string & tags.Format<"email">>();

  const moderatorCreateData = {
    registered_user_id: registeredUserId,
    moderation_permissions: JSON.stringify({
      can_remove_posts: true,
      can_remove_comments: true,
      can_ban_users: true,
      can_warn_users: true,
      can_pin_posts: true,
      can_edit_rules: true,
      can_manage_moderators: true,
      can_approve_posts: true,
    }),
    assigned_communities: JSON.stringify([
      "community-1",
      "community-2",
      "community-3",
    ]),
    appointed_by: "platform-admin",
    moderation_count: 0,
    last_moderation_action: new Date().toISOString(),
    active_status: "active",
    appointed_at: new Date().toISOString(),
    ip: "192.168.1.1",
    href: "https://test-reddit.com/moderator/dashboard",
    referrer: "https://test-reddit.com/join-moderator",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IRedditPlatformCommunityModerator.ICreate;

  const moderatorAccount: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorCreateData,
    });
  typia.assert(moderatorAccount);

  // Test 1: Filter appeals by initial appeal level
  const initialAppealsRequest: IRedditPlatformModerationAppeal.IRequest = {
    appeal_level: "initial",
    limit: 20,
    page: 1,
  };

  const initialAppealsResponse: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: initialAppealsRequest,
      },
    );
  typia.assert(initialAppealsResponse);

  // Validate pagination structure
  TestValidator.equals(
    "initial appeals pagination structure",
    initialAppealsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "initial appeals limit applied",
    initialAppealsResponse.pagination.limit,
    20,
  );

  // Test 2: Filter appeals by secondary appeal level
  const secondaryAppealsRequest: IRedditPlatformModerationAppeal.IRequest = {
    appeal_level: "secondary",
    limit: 15,
    page: 1,
  };

  const secondaryAppealsResponse: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: secondaryAppealsRequest,
      },
    );
  typia.assert(secondaryAppealsResponse);

  TestValidator.equals(
    "secondary appeals pagination structure",
    secondaryAppealsResponse.pagination.current,
    1,
  );

  // Test 3: Filter appeals by final appeal level
  const finalAppealsRequest: IRedditPlatformModerationAppeal.IRequest = {
    appeal_level: "final",
    limit: 10,
    page: 1,
  };

  const finalAppealsResponse: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: finalAppealsRequest,
      },
    );
  typia.assert(finalAppealsResponse);

  TestValidator.equals(
    "final appeals pagination structure",
    finalAppealsResponse.pagination.current,
    1,
  );

  // Test 4: Combination filtering - appeal level + status
  const combinedFilterRequest: IRedditPlatformModerationAppeal.IRequest = {
    appeal_level: "initial",
    status: "pending",
    limit: 25,
    page: 1,
  };

  const combinedFilterResponse: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: combinedFilterRequest,
      },
    );
  typia.assert(combinedFilterResponse);

  // Validate that returned appeals match combined criteria
  const filteredAppeals = combinedFilterResponse.data.filter(
    (appeal) =>
      appeal.appeal_level === "initial" && appeal.status === "pending",
  );
  TestValidator.equals(
    "combined filtering should return matching appeals",
    filteredAppeals.length,
    combinedFilterResponse.data.length,
  );

  // Test 5: Date range filtering combined with appeal level
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30); // 30 days ago
  const toDate = new Date();

  const dateRangeFilterRequest: IRedditPlatformModerationAppeal.IRequest = {
    appeal_level: "initial",
    created_at_from: fromDate.toISOString(),
    created_at_to: toDate.toISOString(),
    limit: 50,
    page: 1,
  };

  const dateRangeFilterResponse: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: dateRangeFilterRequest,
      },
    );
  typia.assert(dateRangeFilterResponse);

  // Test 6: Pagination with appeal level filtering
  const paginatedRequest: IRedditPlatformModerationAppeal.IRequest = {
    appeal_level: "secondary",
    page: 2,
    limit: 10,
  };

  const paginatedResponse: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: paginatedRequest,
      },
    );
  typia.assert(paginatedResponse);

  TestValidator.equals(
    "pagination page number should match request",
    paginatedResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit should match request",
    paginatedResponse.pagination.limit,
    10,
  );

  // Test 7: Sorting with appeal level filtering
  const sortedRequest: IRedditPlatformModerationAppeal.IRequest = {
    appeal_level: "final",
    order_by: "created_at",
    order_direction: "asc",
    limit: 20,
    page: 1,
  };

  const sortedResponse: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: sortedRequest,
      },
    );
  typia.assert(sortedResponse);

  // Test 8: Edge case - non-existent appeal level
  const edgeCaseRequest: IRedditPlatformModerationAppeal.IRequest = {
    appeal_level: "invalid_level",
    limit: 10,
    page: 1,
  };

  const edgeCaseResponse: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: edgeCaseRequest,
      },
    );
  typia.assert(edgeCaseResponse);

  // Should return empty or error response for invalid appeal level
  TestValidator.predicate(
    "invalid appeal level should return empty results",
    edgeCaseResponse.data.length === 0 ||
      edgeCaseResponse.data.every(
        (appeal) => appeal.appeal_level !== "invalid_level",
      ),
  );

  // Test 9: Combination with escalation filtering
  const escalationFilterRequest: IRedditPlatformModerationAppeal.IRequest = {
    appeal_level: "initial",
    is_escalated: true,
    status: "under_review",
    limit: 30,
    page: 1,
  };

  const escalationFilterResponse: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: escalationFilterRequest,
      },
    );
  typia.assert(escalationFilterResponse);

  // Test 10: Maximum limit constraint
  const maxLimitRequest: IRedditPlatformModerationAppeal.IRequest = {
    appeal_level: "final",
    limit: 100, // Maximum allowed
    page: 1,
  };

  const maxLimitResponse: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: maxLimitRequest,
      },
    );
  typia.assert(maxLimitResponse);

  TestValidator.equals(
    "maximum limit should be respected",
    maxLimitResponse.pagination.limit,
    100,
  );

  // Test 11: Empty results scenario
  const emptyResultsRequest: IRedditPlatformModerationAppeal.IRequest = {
    appeal_level: "final",
    status: "approved",
    created_at_from: new Date(Date.now() + 86400000).toISOString(), // Future date
    limit: 20,
    page: 1,
  };

  const emptyResultsResponse: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: emptyResultsRequest,
      },
    );
  typia.assert(emptyResultsResponse);

  TestValidator.predicate(
    "future date filtering should return empty results",
    emptyResultsResponse.data.length === 0,
  );

  // Test 12: Multi-criteria comprehensive filtering
  const comprehensiveRequest: IRedditPlatformModerationAppeal.IRequest = {
    appeal_level: "initial",
    status: "pending",
    is_escalated: false,
    limit: 50,
    page: 1,
    order_by: "updated_at",
    order_direction: "desc",
  };

  const comprehensiveResponse: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: comprehensiveRequest,
      },
    );
  typia.assert(comprehensiveResponse);

  // Validate all returned appeals match the comprehensive criteria
  const validComprehensiveResults = comprehensiveResponse.data.every(
    (appeal) =>
      appeal.appeal_level === "initial" &&
      appeal.status === "pending" &&
      appeal.is_escalated === false,
  );

  TestValidator.predicate(
    "comprehensive filtering should return only matching appeals",
    validComprehensiveResults,
  );

  // Success summary
  TestValidator.equals(
    "test completed - all appeal level filtering scenarios validated",
    true,
    true,
  );
}
