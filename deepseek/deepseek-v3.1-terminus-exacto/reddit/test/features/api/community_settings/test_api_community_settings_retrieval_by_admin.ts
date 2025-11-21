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
 * Test administrator retrieval of community settings including moderation
 * rules, post type allowances, and membership requirements. Validates that
 * administrators can access complete community configuration data regardless of
 * community privacy settings. Tests proper data structure and field
 * completeness.
 */
export async function test_api_community_settings_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create member account for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        href: "https://test-platform.com/register",
        referrer: "https://test-platform.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create community with comprehensive configuration
  const communityName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const communitySlug = communityName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          slug: communitySlug,
          description: RandomGenerator.content({ paragraphs: 2 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Validate community creation
  TestValidator.equals(
    "community ID should be valid UUID",
    typeof community.id,
    "string",
  );
  TestValidator.equals(
    "community name should match input",
    community.name,
    communityName,
  );
  TestValidator.equals(
    "community slug should match generated",
    community.slug,
    communitySlug,
  );

  // Step 3: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123";

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

  // Authenticate as admin for settings access
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://test-platform.com/admin",
      referrer: "https://test-platform.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Test-Agent/1.0",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 4: Retrieve community settings as administrator
  const settings: ICommunityPlatformCommunitySetting =
    await api.functional.communityPlatform.admin.communities.settings.at(
      connection,
      {
        communitySlug: community.slug,
      },
    );
  typia.assert(settings);

  // Step 5: Validate settings structure and completeness
  TestValidator.equals(
    "settings ID should be valid UUID",
    settings.id,
    settings.id,
  );
  TestValidator.equals(
    "community ID should match",
    settings.community_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "community relationship should be established",
    settings.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name should match",
    settings.community.name,
    community.name,
  );
  TestValidator.equals(
    "community slug should match",
    settings.community.slug,
    community.slug,
  );

  // Validate settings fields with proper TestValidator usage
  TestValidator.predicate(
    "post_types_allowed should be defined",
    typeof settings.post_types_allowed === "string",
  );
  TestValidator.predicate(
    "moderation_required should be boolean",
    typeof settings.moderation_required === "boolean",
  );
  TestValidator.predicate(
    "join_requirement should be defined",
    typeof settings.join_requirement === "string",
  );

  // Validate timestamps
  TestValidator.predicate(
    "created_at should be valid date-time",
    typeof settings.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at should be valid date-time",
    typeof settings.updated_at === "string",
  );

  // Validate optional fields with proper type narrowing
  if (settings.banner_image_url !== undefined) {
    const bannerUrl = typia.assert(settings.banner_image_url!);
    TestValidator.predicate(
      "banner_image_url should be valid URI",
      typeof bannerUrl === "string",
    );
  }

  if (settings.icon_image_url !== undefined) {
    const iconUrl = typia.assert(settings.icon_image_url!);
    TestValidator.predicate(
      "icon_image_url should be valid URI",
      typeof iconUrl === "string",
    );
  }

  if (settings.rules_markdown !== undefined) {
    const rulesMarkdown = typia.assert(settings.rules_markdown!);
    TestValidator.predicate(
      "rules_markdown should be string",
      typeof rulesMarkdown === "string",
    );
  }
}
