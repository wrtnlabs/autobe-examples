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

export async function test_api_appeals_filtered_search_by_moderator_status(
  connection: api.IConnection,
) {
  // Create a community moderator account for testing
  const moderatorAccount: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        registered_user_id: typia.random<string & tags.Format<"uuid">>(),
        moderation_permissions: JSON.stringify({
          can_remove_posts: true,
          can_remove_comments: true,
          can_ban_users: false,
          can_warn_users: true,
          can_pin_posts: false,
          can_edit_rules: false,
          can_manage_moderators: false,
          can_approve_posts: true,
        }),
        assigned_communities: JSON.stringify([
          typia.random<string & tags.Format<"uuid">>(),
        ]),
        appointed_by: typia.random<string & tags.Format<"uuid">>(),
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    });
  typia.assert(moderatorAccount);

  // Test filtering by "pending" status
  const pendingAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 20,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(pendingAppeals);

  // Verify all returned appeals have "pending" status
  for (const appeal of pendingAppeals.data) {
    TestValidator.equals(
      "appeal status should be pending",
      appeal.status,
      "pending",
    );
  }

  // Test filtering by "under_review" status
  const underReviewAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          status: "under_review",
          page: 1,
          limit: 20,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(underReviewAppeals);

  // Verify all returned appeals have "under_review" status
  for (const appeal of underReviewAppeals.data) {
    TestValidator.equals(
      "appeal status should be under_review",
      appeal.status,
      "under_review",
    );
  }

  // Test filtering by "approved" status
  const approvedAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 20,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(approvedAppeals);

  // Verify all returned appeals have "approved" status
  for (const appeal of approvedAppeals.data) {
    TestValidator.equals(
      "appeal status should be approved",
      appeal.status,
      "approved",
    );
  }

  // Test filtering by "denied" status
  const deniedAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          status: "denied",
          page: 1,
          limit: 20,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(deniedAppeals);

  // Verify all returned appeals have "denied" status
  for (const appeal of deniedAppeals.data) {
    TestValidator.equals(
      "appeal status should be denied",
      appeal.status,
      "denied",
    );
  }

  // Test filtering by "withdrawn" status
  const withdrawnAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          status: "withdrawn",
          page: 1,
          limit: 20,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(withdrawnAppeals);

  // Verify all returned appeals have "withdrawn" status
  for (const appeal of withdrawnAppeals.data) {
    TestValidator.equals(
      "appeal status should be withdrawn",
      appeal.status,
      "withdrawn",
    );
  }

  // Test filtering by "escalated" status
  const escalatedAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          status: "escalated",
          page: 1,
          limit: 20,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(escalatedAppeals);

  // Verify all returned appeals have "escalated" status
  for (const appeal of escalatedAppeals.data) {
    TestValidator.equals(
      "appeal status should be escalated",
      appeal.status,
      "escalated",
    );
  }

  // Test filtering without status (should return all appeals)
  const allAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(allAppeals);

  // Verify response structure includes pagination
  TestValidator.equals(
    "pagination information should be present",
    allAppeals.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match request",
    allAppeals.pagination.limit,
    20,
  );

  // Test filtering with invalid status (should return empty results)
  const invalidStatusAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          status: "invalid_status",
          page: 1,
          limit: 20,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(invalidStatusAppeals);

  // Should return empty data array for invalid status
  TestValidator.equals(
    "invalid status should return empty results",
    invalidStatusAppeals.data.length,
    0,
  );

  // Test pagination with status filtering
  const paginatedAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          status: "pending",
          page: 2,
          limit: 10,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(paginatedAppeals);

  // Verify pagination properties
  TestValidator.equals(
    "second page should have current=2",
    paginatedAppeals.pagination.current,
    2,
  );
  TestValidator.equals(
    "limit should be 10",
    paginatedAppeals.pagination.limit,
    10,
  );

  // Verify all appeals in paginated result have correct status
  for (const appeal of paginatedAppeals.data) {
    TestValidator.equals(
      "paginated appeal status should be pending",
      appeal.status,
      "pending",
    );
  }

  TestValidator.predicate(
    "appeals filtering test completed successfully",
    true,
  );
}
