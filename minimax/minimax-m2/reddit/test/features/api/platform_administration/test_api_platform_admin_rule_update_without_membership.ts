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

export async function test_api_platform_admin_rule_update_without_membership(
  connection: api.IConnection,
) {
  // Step 1: Create platform administrator account
  const platformAdminEmail = typia.random<string & tags.Format<"email">>();
  const platformAdmin = await api.functional.auth.platformAdministrator.join(
    connection,
    {
      body: {
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        email: platformAdminEmail,
        password: "SecureAdmin123!",
        display_name: "Platform Administrator",
        administrator_level: "admin",
        system_permissions: JSON.stringify({
          user_management: { can_view_user_data: true },
          community_oversight: { can_view_community_data: true },
          content_moderation: { can_remove_content: true },
          system_configuration: { can_view_system_logs: true },
          compliance_legal: { can_access_compliance_data: true },
        }),
        security_clearance: "medium",
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    },
  );
  typia.assert(platformAdmin);

  // Step 2: Create registered user account
  const registeredUserEmail = typia.random<string & tags.Format<"email">>();
  const registeredUser = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: {
        username: `user_${RandomGenerator.alphaNumeric(8)}`,
        email: registeredUserEmail,
        password: "SecureUser123!",
        display_name: "Community Creator",
        href: "https://example.com/register",
        referrer: "https://example.com/landing",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    },
  );
  typia.assert(registeredUser);

  // Step 3: Create a community as the registered user
  const communityName = `testcommunity_${RandomGenerator.alphaNumeric(8)}`;
  const community =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: "Test Community for Security Validation",
          description:
            "A community created to test platform administrator access controls",
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

  // Verify the platform administrator is not a member of this community
  TestValidator.equals(
    "community created successfully",
    community.name,
    communityName,
  );
  TestValidator.equals(
    "registered user is community creator",
    community.creator.id,
    registeredUser.id,
  );

  // Step 4: Attempt to update community rules as platform administrator (should fail)
  await TestValidator.error(
    "platform administrator cannot update rules for non-member community",
    async () => {
      await api.functional.redditPlatform.platformAdministrator.communities.rules.patchByCommunityname(
        connection,
        {
          communityName: community.name,
          body: {
            title: "Updated Rule Title",
            description:
              "This update should be rejected due to lack of membership",
            rule_type: "content",
            priority: 1,
            is_active: true,
          } satisfies IRedditPlatformCommunityRule.IUpdate,
        },
      );
    },
  );
}
