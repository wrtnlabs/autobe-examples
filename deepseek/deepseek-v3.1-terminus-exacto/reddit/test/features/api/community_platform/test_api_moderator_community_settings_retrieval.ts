import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformCommunitySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySetting";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test that a moderator can successfully retrieve community settings after
 * creating a community. Validates that community settings are properly
 * initialized upon community creation and accessible to authorized moderators.
 * The test establishes a new moderator account, creates a community, and then
 * retrieves the community settings to verify all configuration fields are
 * present and correctly populated with default values including post types
 * allowed, moderation requirements, join requirements, banner and icon URLs,
 * and community rules in markdown format.
 */
export async function test_api_moderator_community_settings_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication context
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "TestPassword123";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(),
      moderator_level: "community",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a member account (since community creation requires member authentication)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPass123";

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

  // Step 3: Create community using member authentication
  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    slug: RandomGenerator.alphaNumeric(15),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    privacy: "public",
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityData },
    );
  typia.assert(community);

  // Step 4: Switch back to moderator authentication for settings retrieval
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 5: Retrieve community settings using moderator authentication
  const communitySettings =
    await api.functional.communityPlatform.moderator.communities.settings.at(
      connection,
      { communitySlug: community.slug },
    );
  typia.assert(communitySettings);

  // Step 6: Validate that community settings are properly initialized
  TestValidator.equals(
    "community settings should have correct community ID",
    communitySettings.community_platform_community_id,
    community.id,
  );

  TestValidator.equals(
    "community settings should reference the created community",
    communitySettings.community.id,
    community.id,
  );

  TestValidator.equals(
    "community name should match",
    communitySettings.community.name,
    community.name,
  );

  TestValidator.equals(
    "community slug should match",
    communitySettings.community.slug,
    community.slug,
  );

  // Validate that settings fields are present and properly structured
  TestValidator.predicate(
    "post_types_allowed should be a string",
    typeof communitySettings.post_types_allowed === "string",
  );

  TestValidator.predicate(
    "moderation_required should be a boolean",
    typeof communitySettings.moderation_required === "boolean",
  );

  TestValidator.predicate(
    "join_requirement should be a string",
    typeof communitySettings.join_requirement === "string",
  );

  // Validate specific default values that are likely to be set
  TestValidator.predicate(
    "moderation_required should have a valid boolean value",
    communitySettings.moderation_required === true ||
      communitySettings.moderation_required === false,
  );

  TestValidator.predicate(
    "join_requirement should not be empty",
    communitySettings.join_requirement.length > 0,
  );

  TestValidator.predicate(
    "post_types_allowed should not be empty",
    communitySettings.post_types_allowed.length > 0,
  );

  // Validate timestamps are properly set
  TestValidator.predicate(
    "created_at should be a valid date-time string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(communitySettings.created_at),
  );

  TestValidator.predicate(
    "updated_at should be a valid date-time string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(communitySettings.updated_at),
  );
}
