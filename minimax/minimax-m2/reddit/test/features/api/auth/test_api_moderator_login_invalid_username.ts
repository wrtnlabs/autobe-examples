import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_moderator_login_invalid_username(
  connection: api.IConnection,
) {
  // Step 1: Create a valid community moderator account for prerequisites
  const validModerator: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        registered_user_id: typia.random<string & tags.Format<"uuid">>(),
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
        assigned_communities: JSON.stringify([]),
        appointed_by: typia.random<string & tags.Format<"uuid">>(),
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        href: "https://test.example.com",
        referrer: "https://test.example.com/referrer",
        ip: "192.168.1.1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    });
  typia.assert(validModerator);

  // Step 2: Generate invalid credentials (non-existent username/email)
  const invalidUsername = `${RandomGenerator.alphabets(8)}@nonexistent-${RandomGenerator.alphaNumeric(6)}.com`;

  // Step 3: Test login failure with invalid username/email
  await TestValidator.error(
    "login with invalid username should fail",
    async () => {
      await api.functional.auth.communityModerator.login(connection, {
        body: {
          username: invalidUsername,
          password: "invalidPassword123",
          href: "https://test.example.com",
          referrer: "https://test.example.com/login",
        } satisfies IRedditPlatformCommunityModerator.ILogin,
      });
    },
  );
}
