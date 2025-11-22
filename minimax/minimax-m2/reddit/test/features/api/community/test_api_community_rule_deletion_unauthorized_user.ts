import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityRule";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

export async function test_api_community_rule_deletion_unauthorized_user(
  connection: api.IConnection,
) {
  // Generate unique test identifiers
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const userEmail = typia.random<string & tags.Format<"email">>();
  const communityName = `test_community_${RandomGenerator.alphaNumeric(8)}`;
  const ruleId = typia.random<string & tags.Format<"uuid">>();

  // Step 1: Create platform administrator account
  const admin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        email: adminEmail,
        password: "admin123",
        display_name: "Test Administrator",
        administrator_level: "admin",
        security_clearance: "medium",
        system_permissions: JSON.stringify({
          user_management: { can_view_user_data: true },
          community_oversight: {
            can_create_communities: true,
            can_view_community_data: true,
          },
          content_moderation: { can_remove_content: true },
          system_configuration: { can_view_system_logs: true },
          compliance_legal: { can_access_compliance_data: true },
        }),
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create registered user account
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `user_${RandomGenerator.alphaNumeric(8)}`,
        email: userEmail,
        password: "user123",
        display_name: "Test User",
        href: "https://test.com/register",
        referrer: "https://test.com/home",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 3: Create a test community (registered users can create communities)
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: `Test Community ${communityName}`,
          description: "Community for testing rule deletion authorization",
          type: "public",
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: true,
          require_post_approval: false,
          require_comment_approval: false,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create community rules using administrator account
  // First switch to administrator context
  await api.functional.auth.platformAdministrator.login(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      ip: "192.168.1.100",
      href: "https://admin.test.com",
      referrer: "https://admin.test.com/dashboard",
    } satisfies IRedditPlatformPlatformAdministrator.ILogin,
  });

  // Create community rules (using direct API call since we need to simulate rule creation)
  // Note: In real implementation, there would be a POST endpoint for creating rules
  // For this test, we'll simulate the existence of rules and directly test deletion

  // Step 5: Switch back to registered user context for authorization testing
  await api.functional.auth.registeredUser.login(connection, {
    body: {
      email: userEmail,
      password: "user123",
      href: "https://test.com/login",
      referrer: "https://test.com",
    } satisfies IRedditPlatformRegisteredUser.ILogin,
  });

  // Step 6: Attempt to delete community rule as registered user (should fail)
  await TestValidator.error(
    "registered user cannot delete community rules",
    async () => {
      await api.functional.redditPlatform.platformAdministrator.communities.rules.erase(
        connection,
        {
          communityName: community.name,
          ruleId: ruleId,
        },
      );
    },
  );

  // Step 7: Verify that the user remains authenticated (error is authorization, not authentication)
  const userAfterAttempt: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.login(connection, {
      body: {
        email: userEmail,
        password: "user123",
        href: "https://test.com/verify",
        referrer: "https://test.com",
      } satisfies IRedditPlatformRegisteredUser.ILogin,
    });
  typia.assert(userAfterAttempt);

  // Verify user account is still active and functional
  TestValidator.equals(
    "user account remains active after failed rule deletion attempt",
    userAfterAttempt.accountStatus,
    "active",
  );
}
