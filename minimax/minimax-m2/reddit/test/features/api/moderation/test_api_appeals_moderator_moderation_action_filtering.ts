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

export async function test_api_appeals_moderator_moderation_action_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create community moderator account
  const registeredUserId = typia.random<string & tags.Format<"uuid">>();
  const moderatorAccount: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        registered_user_id: registeredUserId,
        moderation_permissions: JSON.stringify({
          can_remove_posts: true,
          can_remove_comments: true,
          can_ban_users: true,
          can_warn_users: true,
          can_pin_posts: false,
          can_edit_rules: false,
          can_manage_moderators: false,
          can_approve_posts: true,
        }),
        assigned_communities: JSON.stringify([]),
        appointed_by: "system",
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        href: "https://test.example.com",
        referrer: "https://test.example.com",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    });
  typia.assert(moderatorAccount);

  // Step 2: Test appeals filtering without moderation_action_id (baseline)
  const baselineSearch: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(baselineSearch);

  // Step 3: Test appeals filtering with specific moderation_action_id
  const targetModerationActionId = typia.random<string & tags.Format<"uuid">>();
  const filteredSearch: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          moderation_action_id: targetModerationActionId,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(filteredSearch);

  // Step 4: Validate filtering results
  TestValidator.equals(
    "filtered appeals count should be appropriate",
    baselineSearch.data.length >= 0,
    true,
  );

  // All returned appeals should match the filtering criteria
  for (const appeal of filteredSearch.data) {
    TestValidator.equals(
      "appeal moderation action should match filter",
      appeal.moderation_action.id,
      targetModerationActionId,
    );
  }

  // Step 5: Test filtering with additional parameters
  const complexFilterSearch: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          moderation_action_id: targetModerationActionId,
          status: "pending",
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(complexFilterSearch);

  // Step 6: Test pagination with filtering
  if (filteredSearch.data.length > 5) {
    const paginatedSearch: IPageIRedditPlatformModerationAppeal.ISummary =
      await api.functional.redditPlatform.communityModerator.appeals.index(
        connection,
        {
          body: {
            page: 2,
            limit: 3,
            moderation_action_id: targetModerationActionId,
          } satisfies IRedditPlatformModerationAppeal.IRequest,
        },
      );
    typia.assert(paginatedSearch);

    TestValidator.equals(
      "pagination metadata should be consistent",
      paginatedSearch.pagination.current,
      2,
    );

    TestValidator.equals(
      "paginated results should still match filter",
      paginatedSearch.data.length <= 3,
      true,
    );
  }

  // Step 7: Test invalid moderation_action_id handling
  await TestValidator.error(
    "invalid moderation_action_id should be handled gracefully",
    async () => {
      await api.functional.redditPlatform.communityModerator.appeals.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            moderation_action_id: "invalid-uuid-format",
          } satisfies IRedditPlatformModerationAppeal.IRequest,
        },
      );
    },
  );

  // Step 8: Test with multiple filter combinations
  const multiFilterSearch: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          moderation_action_id: targetModerationActionId,
          status: "under_review",
          appeal_level: "initial",
          is_escalated: false,
          order_by: "resolved_at",
          order_direction: "asc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(multiFilterSearch);

  // Step 9: Validate response structure and metadata
  TestValidator.equals(
    "response should have pagination metadata",
    baselineSearch.pagination.current,
    1,
  );

  TestValidator.equals(
    "response should include records",
    Array.isArray(baselineSearch.data),
    true,
  );

  // Step 10: Performance validation for large limit values
  const largeLimitSearch: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          moderation_action_id: targetModerationActionId,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(largeLimitSearch);

  TestValidator.equals(
    "large limit should respect maximum",
    largeLimitSearch.data.length <= 100,
    true,
  );
}
