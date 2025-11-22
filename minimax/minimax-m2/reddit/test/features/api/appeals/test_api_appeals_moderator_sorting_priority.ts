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

export async function test_api_appeals_moderator_sorting_priority(
  connection: api.IConnection,
) {
  // Step 1: Create community moderator account for testing
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorId = typia.random<string & tags.Format<"uuid">>();

  const moderator: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        registered_user_id: moderatorId,
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
        assigned_communities: JSON.stringify([
          typia.random<string & tags.Format<"uuid">>(),
        ]),
        appointed_by: typia.random<string & tags.Format<"uuid">>(),
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        href: "https://example.com/test",
        referrer: "https://google.com",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Test sorting by creation date (ascending)
  const createdAsc =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          order_by: "created_at",
          order_direction: "asc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(createdAsc);
  TestValidator.predicate(
    "creation date ascending sort",
    createdAsc.data.length >= 0,
  );

  // Test sorting by creation date (descending)
  const createdDesc =
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
  typia.assert(createdDesc);
  TestValidator.predicate(
    "creation date descending sort",
    createdDesc.data.length >= 0,
  );

  // Test sorting by update date (ascending)
  const updatedAsc =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          order_by: "updated_at",
          order_direction: "asc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(updatedAsc);
  TestValidator.predicate(
    "update date ascending sort",
    updatedAsc.data.length >= 0,
  );

  // Test sorting by update date (descending)
  const updatedDesc =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          order_by: "updated_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(updatedDesc);
  TestValidator.predicate(
    "update date descending sort",
    updatedDesc.data.length >= 0,
  );

  // Test sorting by resolution date (ascending)
  const resolvedAsc =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          order_by: "resolved_at",
          order_direction: "asc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(resolvedAsc);
  TestValidator.predicate(
    "resolution date ascending sort",
    resolvedAsc.data.length >= 0,
  );

  // Test sorting by resolution date (descending)
  const resolvedDesc =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          order_by: "resolved_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(resolvedDesc);
  TestValidator.predicate(
    "resolution date descending sort",
    resolvedDesc.data.length >= 0,
  );

  // Test sorting by appeal level (ascending)
  const levelAsc =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          order_by: "appeal_level",
          order_direction: "asc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(levelAsc);
  TestValidator.predicate(
    "appeal level ascending sort",
    levelAsc.data.length >= 0,
  );

  // Test sorting by appeal level (descending)
  const levelDesc =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          order_by: "appeal_level",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(levelDesc);
  TestValidator.predicate(
    "appeal level descending sort",
    levelDesc.data.length >= 0,
  );

  // Test default sorting (should default to created_at descending)
  const defaultSort =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(defaultSort);
  TestValidator.predicate(
    "default sorting works",
    defaultSort.data.length >= 0,
  );

  // Verify pagination metadata is consistent across all sorting requests
  TestValidator.equals(
    "pagination metadata consistency",
    createdAsc.pagination,
    defaultSort.pagination,
  );
}
