import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test community information update workflow by a moderator.
 *
 * This test validates that moderators can successfully update community details
 * including description and privacy settings. The workflow involves:
 *
 * - Member creation and community setup
 * - Moderator authentication
 * - Community information modification
 * - Validation of updated community properties
 */
export async function test_api_community_moderator_update_description_and_privacy(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "password123";

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

  // Step 2: Create a community as the member
  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    slug: RandomGenerator.alphaNumeric(10),
    description: "Initial community description",
    privacy: "public",
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        display_name: RandomGenerator.name(),
        moderator_level: "global",
        is_active: true,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 4: Update community information as moderator
  const updatedDescription =
    "Updated community description with moderator changes";
  const updatedPrivacy = "private";

  const updatedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.moderator.communities.update(
      connection,
      {
        communitySlug: community.slug,
        body: {
          description: updatedDescription,
          privacy: updatedPrivacy,
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);

  // Step 5: Validate the updated community information
  TestValidator.equals(
    "community ID should remain unchanged",
    updatedCommunity.id,
    community.id,
  );

  TestValidator.equals(
    "community name should remain unchanged",
    updatedCommunity.name,
    community.name,
  );

  TestValidator.equals(
    "community slug should remain unchanged",
    updatedCommunity.slug,
    community.slug,
  );

  TestValidator.equals(
    "community description should be updated",
    updatedCommunity.description,
    updatedDescription,
  );

  TestValidator.equals(
    "community privacy should be updated",
    updatedCommunity.privacy,
    updatedPrivacy,
  );

  TestValidator.equals(
    "community status should remain active",
    updatedCommunity.status,
    "active",
  );

  TestValidator.predicate(
    "updated_at timestamp should be newer than created_at",
    new Date(updatedCommunity.updated_at) > new Date(community.created_at),
  );
}
