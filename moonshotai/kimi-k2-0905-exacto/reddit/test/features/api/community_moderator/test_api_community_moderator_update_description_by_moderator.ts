import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test that a community moderator can update their community's description to
 * clarify community focus and guidelines.
 *
 * This test validates the community update functionality for community
 * moderators, focusing on description field updates, length constraints, and
 * proper authorization. The test follows a multi-actor authentication pattern
 * where a member creates a community and then the moderator updates the
 * community description.
 *
 * Test workflow:
 *
 * 1. Create a member account for community creation reference
 * 2. Create a community moderator account for update permissions
 * 3. Create a community as the moderator
 * 4. Update the community description with comprehensive content
 * 5. Verify the update was successful and description matches expected values
 *
 * The test ensures community moderators have proper permissions to update
 * community descriptions while validating content constraints and maintaining
 * data integrity.
 */
export async function test_api_community_moderator_update_description_by_moderator(
  connection: api.IConnection,
) {
  // First, create a member account for reference
  const memberEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: "member123456",
    } satisfies IRedditCommunityMember.ICreate,
  });

  // Switch to create a community moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.communityModerator.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: moderatorEmail,
      password: "moderator123456",
      href: "https://reddit-community.org/",
      referrer: "https://reddit-community.org/join",
      ip: null,
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });

  // Create a community as the moderator
  const communityName = RandomGenerator.alphabets(10).toLowerCase();
  const originalDescription = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 5,
    wordMax: 10,
  });

  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: communityName,
        title: RandomGenerator.name(3),
        description: originalDescription,
        category_name: "Technology",
        type: "public",
        allow_crosspost: true,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // Update the community description as the moderator
  const updatedDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 6,
    wordMax: 12,
  });

  const updatedCommunity =
    await api.functional.redditCommunity.communityModerator.communities.update(
      connection,
      {
        communityName: community.name,
        body: {
          description: updatedDescription,
        } satisfies IRedditCommunityCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);

  // Verify the community was updated correctly
  TestValidator.equals(
    "community ID matches",
    updatedCommunity.id,
    community.id,
  );
  TestValidator.equals(
    "community name unchanged",
    updatedCommunity.name,
    community.name,
  );
  TestValidator.equals(
    "description updated correctly",
    updatedCommunity.description,
    updatedDescription,
  );
}
