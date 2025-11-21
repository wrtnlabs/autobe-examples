import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformCommunitySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySetting";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test community settings update workflow where an administrator modifies
 * configuration settings for any community on the platform.
 *
 * This test validates administrative privileges allowing updates to community
 * settings regardless of community ownership. The scenario ensures proper
 * authentication flow with admin join operation, community creation
 * prerequisite, and successful settings update with validation of response data
 * structure and administrative override capabilities.
 */
export async function test_api_community_settings_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account with system-wide access privileges
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassword123!";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create community entity that will have its settings updated by admin
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Switch to administrator authentication
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 5: Update community settings using administrative privileges
  const updatedSettings: ICommunityPlatformCommunitySetting =
    await api.functional.communityPlatform.admin.communities.settings.update(
      connection,
      {
        communitySlug: community.slug,
        body: {
          post_types_allowed: "text,link,image",
          moderation_required: true,
          join_requirement: "approval",
          banner_image_url: "https://example.com/banner.jpg",
          icon_image_url: "https://example.com/icon.png",
          rules_markdown:
            "## Community Rules\n\n1. Be respectful to all members\n2. No spam or self-promotion\n3. Follow platform guidelines",
        } satisfies ICommunityPlatformCommunitySetting.IUpdate,
      },
    );
  typia.assert(updatedSettings);

  // Step 6: Validate the updated settings match expected configuration
  TestValidator.equals(
    "community ID matches",
    updatedSettings.community_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "post types allowed",
    updatedSettings.post_types_allowed,
    "text,link,image",
  );
  TestValidator.predicate(
    "moderation required is enabled",
    updatedSettings.moderation_required === true,
  );
  TestValidator.equals(
    "join requirement",
    updatedSettings.join_requirement,
    "approval",
  );
  TestValidator.equals(
    "banner image URL",
    updatedSettings.banner_image_url,
    "https://example.com/banner.jpg",
  );
  TestValidator.equals(
    "icon image URL",
    updatedSettings.icon_image_url,
    "https://example.com/icon.png",
  );
  TestValidator.predicate(
    "rules markdown contains expected content",
    updatedSettings.rules_markdown?.includes("Community Rules") === true,
  );

  // Additional validation: Ensure admin can update settings they don't own
  TestValidator.predicate(
    "admin successfully updated community settings",
    updatedSettings.id !== undefined,
  );
  TestValidator.predicate(
    "community reference exists",
    updatedSettings.community !== undefined,
  );
  TestValidator.equals(
    "community slug matches",
    updatedSettings.community.slug,
    community.slug,
  );
}
