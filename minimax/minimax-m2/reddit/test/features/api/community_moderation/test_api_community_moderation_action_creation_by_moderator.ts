import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAction";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_moderation_action_creation_by_moderator(
  connection: api.IConnection,
) {
  // 1. Authenticate as community moderator
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
        assigned_communities: JSON.stringify([
          typia.random<string & tags.Format<"uuid">>(),
          typia.random<string & tags.Format<"uuid">>(),
        ]),
        appointed_by: "system_admin",
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        href: "https://example.com/register",
        referrer: "https://example.com/login",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create a comprehensive moderation action
  const moderationAction: IRedditPlatformModerationAction =
    await api.functional.redditPlatform.communityModerator.moderationActions.create(
      connection,
      {
        body: {
          action_type: "user_warning",
          reason:
            "Repeated violations of community guidelines regarding spam content",
          duration_hours: 24,
          moderator_session_id: moderator.moderator.id,
          is_automated: false,
          status: "active",
          admin_notes:
            "Multiple violations observed in past 48 hours. First formal warning issued.",
        } satisfies IRedditPlatformModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // 3. Validate moderation action creation
  TestValidator.equals(
    "moderation action has correct action type",
    moderationAction.action_type,
    "user_warning",
  );
  TestValidator.equals(
    "moderation action has correct reason",
    moderationAction.reason,
    "Repeated violations of community guidelines regarding spam content",
  );
  TestValidator.equals(
    "moderation action has correct duration",
    moderationAction.duration_hours,
    24,
  );
  TestValidator.equals(
    "moderation action has correct status",
    moderationAction.status,
    "active",
  );
  TestValidator.equals(
    "moderation action is manual (not automated)",
    moderationAction.is_automated,
    false,
  );
  TestValidator.equals(
    "moderation action has correct moderator session",
    moderationAction.moderator_session_id,
    moderator.moderator.id,
  );
  TestValidator.equals(
    "moderation action has admin notes",
    moderationAction.admin_notes,
    "Multiple violations observed in past 48 hours. First formal warning issued.",
  );
}
