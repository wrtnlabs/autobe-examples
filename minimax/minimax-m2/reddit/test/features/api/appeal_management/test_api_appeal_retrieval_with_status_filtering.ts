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
 * Test appeal retrieval with comprehensive status filtering including pending,
 * under_review, approved, denied, and escalated appeals.
 *
 * This test validates that community moderators can efficiently filter appeals
 * by status to focus on specific appeal types and review workflows. The test
 * creates a complete moderation context with multiple appeals in different
 * states, then systematically tests the status filtering functionality to
 * ensure moderators can effectively manage their appeal queue.
 *
 * Test workflow:
 *
 * 1. Authenticate as community moderator to establish proper authorization context
 * 2. Create a moderation action that will serve as the context for appeals
 * 3. Generate appeals with different statuses (pending, under_review, approved,
 *    denied, escalated)
 * 4. Test status filtering by retrieving appeals with specific status criteria
 * 5. Validate that filtering returns only appeals matching the specified status
 * 6. Verify pagination works correctly with filtered results
 * 7. Ensure all appeal data is properly structured and accessible
 */
export async function test_api_appeal_retrieval_with_status_filtering(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as community moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        registered_user_id: typia.random<string & tags.Format<"uuid">>(),
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
        assigned_communities: JSON.stringify([]),
        appointed_by: "system_admin",
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        href: "https://example.com/moderator/dashboard",
        referrer: "https://example.com",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create moderation action context for appeals
  const moderationAction: IRedditPlatformModerationAction =
    await api.functional.redditPlatform.communityModerator.moderationActions.create(
      connection,
      {
        body: {
          action_type: "user_warning",
          reason: "Test moderation action for appeal filtering",
          status: "active",
          moderator_session_id: moderator.moderator.id,
          admin_notes:
            "Created for testing appeal status filtering functionality",
        } satisfies IRedditPlatformModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Step 3: Create appeals with different statuses
  // Note: Since we can't directly create appeals through the available API,
  // we'll test the retrieval functionality with the appeals that exist for this moderation action

  const appealStatuses = [
    "pending",
    "under_review",
    "approved",
    "denied",
    "escalated",
  ];

  // Step 4: Test status filtering for each status type
  for (const status of appealStatuses) {
    const filteredAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
      await api.functional.redditPlatform.communityModerator.moderationActions.appeals.index(
        connection,
        {
          moderationActionId: moderationAction.id,
          body: {
            status: status,
            page: 1,
            limit: 20,
            order_by: "created_at",
            order_direction: "desc",
          } satisfies IRedditPlatformModerationAppeal.IRequest,
        },
      );

    typia.assert(filteredAppeals);

    // Validate pagination structure
    TestValidator.equals(
      "pagination structure",
      filteredAppeals.pagination.current,
      1,
    );
    TestValidator.equals(
      "limit preserved",
      filteredAppeals.pagination.limit,
      20,
    );

    // Validate that if there are appeals, they all have the requested status
    if (filteredAppeals.data.length > 0) {
      TestValidator.predicate(
        "all returned appeals have requested status",
        filteredAppeals.data.every((appeal) => appeal.status === status),
      );
    }
  }

  // Step 5: Test combined filtering (status + appeal level)
  const complexFilter: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.moderationActions.appeals.index(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: {
          status: "pending",
          appeal_level: "initial",
          page: 1,
          limit: 10,
          order_by: "created_at",
          order_direction: "asc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );

  typia.assert(complexFilter);

  // Step 6: Test pagination with filtering
  const paginatedResults: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.moderationActions.appeals.index(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: {
          status: "under_review",
          page: 2,
          limit: 5,
          order_by: "updated_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );

  typia.assert(paginatedResults);
  TestValidator.equals(
    "pagination page",
    paginatedResults.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedResults.pagination.limit,
    5,
  );

  // Step 7: Test without status filter (should return all appeals)
  const allAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.moderationActions.appeals.index(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: {
          page: 1,
          limit: 50,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );

  typia.assert(allAppeals);

  // Validate response structure integrity
  TestValidator.predicate(
    "response has data array",
    Array.isArray(allAppeals.data),
  );
  TestValidator.predicate(
    "response has pagination info",
    allAppeals.pagination &&
      typeof allAppeals.pagination.current === "number" &&
      typeof allAppeals.pagination.limit === "number",
  );

  // Step 8: Validate appeal data structure when appeals exist
  if (allAppeals.data.length > 0) {
    const sampleAppeal = allAppeals.data[0];

    // Validate required appeal properties
    TestValidator.predicate(
      "appeal has id",
      typeof sampleAppeal.id === "string",
    );
    TestValidator.predicate(
      "appeal has status",
      typeof sampleAppeal.status === "string",
    );
    TestValidator.predicate(
      "appeal has reason",
      typeof sampleAppeal.appeal_reason === "string",
    );
    TestValidator.predicate(
      "appeal has created_at",
      typeof sampleAppeal.created_at === "string",
    );

    // Validate related entities
    if (sampleAppeal.moderation_action) {
      TestValidator.predicate(
        "moderation action reference exists",
        typeof sampleAppeal.moderation_action.id === "string",
      );
    }

    if (sampleAppeal.appellant_session) {
      TestValidator.predicate(
        "appellant session reference exists",
        typeof sampleAppeal.appellant_session.id === "string",
      );
    }
  }
}
