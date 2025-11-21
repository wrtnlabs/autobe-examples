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
 * Test settings retrieval across different community privacy levels.
 * Administrator accesses settings from public, private, and restricted
 * communities to validate consistent access regardless of community privacy
 * configuration. Tests authorization boundary enforcement for administrative
 * access.
 */
export async function test_api_community_settings_public_private_access(
  connection: api.IConnection,
) {
  // Create administrator account with universal access
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Create member account for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        display_name: RandomGenerator.name(),
        ip: "192.168.1.1",
        href: "https://community-platform.example.com/register",
        referrer: "https://community-platform.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Create communities with different privacy settings
  const privacyLevels = ["public", "private", "restricted"] as const;
  const communities: ICommunityPlatformCommunity[] = [];

  for (const privacy of privacyLevels) {
    const community: ICommunityPlatformCommunity =
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            slug: RandomGenerator.alphaNumeric(10),
            description: RandomGenerator.content({ paragraphs: 1 }),
            privacy: privacy,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    typia.assert(community);
    communities.push(community);
  }

  // Switch to administrator account
  const adminLogin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        ip: "192.168.1.1",
        href: "https://community-platform.example.com/admin",
        referrer: "https://community-platform.example.com",
        session_id: typia.random<string & tags.Format<"uuid">>(),
        user_agent: "Mozilla/5.0 (Test Agent)",
      } satisfies ICommunityPlatformAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // Retrieve and validate settings for each community
  for (const community of communities) {
    const settings: ICommunityPlatformCommunitySetting =
      await api.functional.communityPlatform.admin.communities.settings.at(
        connection,
        {
          communitySlug: community.slug,
        },
      );
    typia.assert(settings);

    // Validate settings reference correct community
    TestValidator.equals(
      "settings community ID match",
      settings.community_platform_community_id,
      community.id,
    );
    TestValidator.equals(
      "nested community ID match",
      settings.community.id,
      community.id,
    );
    TestValidator.equals(
      "community slug consistency",
      settings.community.slug,
      community.slug,
    );
    TestValidator.equals(
      "privacy level consistency",
      settings.community.privacy,
      community.privacy,
    );
  }

  // Verify all privacy levels were successfully accessed
  TestValidator.equals("number of communities created", communities.length, 3);

  const accessedPrivacies = communities.map((c) => c.privacy);
  TestValidator.predicate(
    "public community accessed",
    accessedPrivacies.includes("public"),
  );
  TestValidator.predicate(
    "private community accessed",
    accessedPrivacies.includes("private"),
  );
  TestValidator.predicate(
    "restricted community accessed",
    accessedPrivacies.includes("restricted"),
  );
}
