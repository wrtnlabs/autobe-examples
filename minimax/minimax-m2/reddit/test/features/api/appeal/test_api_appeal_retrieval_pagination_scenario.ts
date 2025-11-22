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

export async function test_api_appeal_retrieval_pagination_scenario(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for testing
  const moderatorId = typia.random<string & tags.Format<"uuid">>();
  const moderatorData = {
    registered_user_id: moderatorId,
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
    assigned_communities: JSON.stringify(["community-1", "community-2"]),
    appointed_by: "system-admin",
    moderation_count: 0,
    last_moderation_action: new Date().toISOString(),
    active_status: "active",
    appointed_at: new Date().toISOString(),
    href: "https://example.com/moderator/join",
    referrer: "https://example.com/admin/dashboard",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IRedditPlatformCommunityModerator.ICreate;

  const moderator: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a moderation action
  const moderationActionData = {
    action_type: "content_removal",
    reason: "Test moderation action for appeal pagination",
    status: "active",
    moderator_session_id: moderator.moderator.id,
    admin_notes: "Created for testing appeal pagination functionality",
  } satisfies IRedditPlatformModerationAction.ICreate;

  const moderationAction: IRedditPlatformModerationAction =
    await api.functional.redditPlatform.communityModerator.moderationActions.create(
      connection,
      {
        body: moderationActionData,
      },
    );
  typia.assert(moderationAction);

  // Step 3: Test basic pagination - first page
  const firstPageRequest: IRedditPlatformModerationAppeal.IRequest = {
    page: 1,
    limit: 5,
    order_by: "created_at",
    order_direction: "desc",
  };

  const firstPageResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.moderationActions.appeals.index(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: firstPageRequest,
      },
    );
  typia.assert(firstPageResult);

  // Step 4: Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    firstPageResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    firstPageResult.pagination.limit === firstPageRequest.limit,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    firstPageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    firstPageResult.pagination.pages >= 0,
  );

  // Step 5: Test different sorting criteria
  const sortedByDateRequest: IRedditPlatformModerationAppeal.IRequest = {
    page: 1,
    limit: 10,
    order_by: "resolved_at",
    order_direction: "asc",
  };

  const sortedByDateResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.moderationActions.appeals.index(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: sortedByDateRequest,
      },
    );
  typia.assert(sortedByDateResult);

  // Step 6: Test different page size
  const largePageRequest: IRedditPlatformModerationAppeal.IRequest = {
    page: 1,
    limit: 50,
    order_by: "appeal_level",
    order_direction: "desc",
  };

  const largePageResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.moderationActions.appeals.index(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: largePageRequest,
      },
    );
  typia.assert(largePageResult);

  TestValidator.equals(
    "large page limit",
    largePageResult.pagination.limit,
    50,
  );

  // Step 7: Test second page if there are enough records
  if (firstPageResult.pagination.pages > 1) {
    const secondPageRequest: IRedditPlatformModerationAppeal.IRequest = {
      page: 2,
      limit: 5,
      order_by: "created_at",
      order_direction: "desc",
    };

    const secondPageResult: IPageIRedditPlatformModerationAppeal.ISummary =
      await api.functional.redditPlatform.communityModerator.moderationActions.appeals.index(
        connection,
        {
          moderationActionId: moderationAction.id,
          body: secondPageRequest,
        },
      );
    typia.assert(secondPageResult);

    TestValidator.equals(
      "second page number",
      secondPageResult.pagination.current,
      2,
    );
  }

  // Step 8: Test filtering by appeal status
  const statusFilterRequest: IRedditPlatformModerationAppeal.IRequest = {
    page: 1,
    limit: 10,
    status: "pending",
    order_by: "created_at",
    order_direction: "desc",
  };

  const statusFilterResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.moderationActions.appeals.index(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: statusFilterRequest,
      },
    );
  typia.assert(statusFilterResult);

  // Step 9: Test filtering by appeal level
  const levelFilterRequest: IRedditPlatformModerationAppeal.IRequest = {
    page: 1,
    limit: 10,
    appeal_level: "initial",
    order_by: "updated_at",
    order_direction: "desc",
  };

  const levelFilterResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.moderationActions.appeals.index(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: levelFilterRequest,
      },
    );
  typia.assert(levelFilterResult);

  // Step 10: Test date range filtering
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const dateRangeRequest: IRedditPlatformModerationAppeal.IRequest = {
    page: 1,
    limit: 20,
    created_at_from: yesterday.toISOString(),
    created_at_to: tomorrow.toISOString(),
    order_by: "created_at",
    order_direction: "desc",
  };

  const dateRangeResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.moderationActions.appeals.index(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: dateRangeRequest,
      },
    );
  typia.assert(dateRangeResult);

  // Step 11: Validate data consistency across all responses
  TestValidator.predicate(
    "all responses have valid pagination",
    [
      firstPageResult,
      sortedByDateResult,
      largePageResult,
      statusFilterResult,
      levelFilterResult,
      dateRangeResult,
    ].every(
      (result) =>
        result.pagination.current >= 0 &&
        result.pagination.limit > 0 &&
        result.pagination.records >= 0 &&
        result.pagination.pages >= 0,
    ),
  );

  // Step 12: Test sorting order consistency
  if (firstPageResult.data.length > 1) {
    for (let i = 0; i < firstPageResult.data.length - 1; i++) {
      const currentAppeal = firstPageResult.data[i];
      const nextAppeal = firstPageResult.data[i + 1];

      // For descending order by created_at, current should be >= next
      TestValidator.predicate(
        `appeal ${i} created before appeal ${i + 1}`,
        new Date(currentAppeal.created_at).getTime() >=
          new Date(nextAppeal.created_at).getTime(),
      );
    }
  }
}
