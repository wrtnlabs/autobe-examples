import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformCommunitySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySetting";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validates that authenticated members can access community settings for
 * communities they belong to. This test ensures proper access control where
 * members can view settings of communities they are part of while respecting
 * privacy settings and membership requirements.
 */
export async function test_api_member_community_settings_access(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "testPassword123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a community that will have settings accessed
  const communityName = RandomGenerator.paragraph({ sentences: 3 });
  // Generate a URL-friendly slug from the community name
  const communitySlug = communityName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 20);

  const community =
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

  // Step 3: Retrieve the community settings to validate member access
  const settings =
    await api.functional.communityPlatform.member.communities.settings.at(
      connection,
      {
        communitySlug: community.slug,
      },
    );
  typia.assert(settings);

  // Step 4: Validate that the settings match the expected community configuration
  TestValidator.equals(
    "community ID should match",
    settings.community_platform_community_id,
    community.id,
  );

  TestValidator.equals(
    "community slug should match",
    settings.community.slug,
    community.slug,
  );

  TestValidator.equals(
    "community name should match",
    settings.community.name,
    community.name,
  );

  TestValidator.predicate(
    "settings should contain post types configuration",
    typeof settings.post_types_allowed === "string" &&
      settings.post_types_allowed.length > 0,
  );

  TestValidator.predicate(
    "settings should contain join requirement configuration",
    typeof settings.join_requirement === "string" &&
      settings.join_requirement.length > 0,
  );

  TestValidator.predicate(
    "settings should have valid timestamps",
    settings.created_at !== null && settings.updated_at !== null,
  );

  TestValidator.predicate(
    "settings should have a valid community reference",
    settings.community !== null && typeof settings.community === "object",
  );

  TestValidator.equals(
    "moderation required should be a boolean",
    typeof settings.moderation_required,
    "boolean",
  );
}
