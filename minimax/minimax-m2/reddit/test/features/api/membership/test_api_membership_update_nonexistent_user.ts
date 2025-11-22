import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMembership";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_membership_update_nonexistent_user(
  connection: api.IConnection,
) {
  // Step 1: Create a community moderator account for testing
  const moderatorCreation = await api.functional.auth.communityModerator.join(
    connection,
    {
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
        assigned_communities: JSON.stringify(["test-community"]),
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
    },
  );
  typia.assert(moderatorCreation);

  // Step 2: Test error handling for non-existent user
  // Use a random UUID that doesn't correspond to any real user
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();
  const communityName = "test-community";

  // Step 3: Attempt to update membership for non-existent user
  await TestValidator.error(
    "membership update should fail for non-existent user",
    async () => {
      await api.functional.redditPlatform.communities.members.update(
        connection,
        {
          communityName,
          userId: nonExistentUserId,
          body: {
            membership_level: "member",
            post_permissions: true,
            comment_permissions: true,
            vote_permissions: true,
          } satisfies IRedditPlatformCommunityMembership.IUpdate,
        },
      );
    },
  );
}
