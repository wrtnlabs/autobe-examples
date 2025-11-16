import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test the complete workflow of a moderator creating a new community.
 *
 * This test validates that authenticated moderators can successfully establish
 * new community spaces with proper configuration and metadata. It covers the
 * entire flow from moderator registration through community creation and
 * verification.
 *
 * Steps:
 *
 * 1. Register and authenticate as a new moderator
 * 2. Create a community with valid name, display title, and description
 * 3. Verify the community is created successfully
 * 4. Validate the returned community data matches the input
 * 5. Confirm the moderator is assigned as the community creator
 */
export async function test_api_community_creation_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a new moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderatorNickname = RandomGenerator.name();

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: moderatorNickname,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Verify moderator authentication was successful
  TestValidator.predicate(
    "moderator should be authenticated with valid token",
    moderator.token.access.length > 0,
  );
  TestValidator.equals(
    "moderator email should match registration",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator nickname should match registration",
    moderator.nickname,
    moderatorNickname,
  );

  // Step 2: Create a community with valid configuration
  const communityName = RandomGenerator.alphabets(12).toLowerCase();
  const communityDisplayTitle = RandomGenerator.name(3);
  const communityDescription = RandomGenerator.paragraph({ sentences: 5 });
  const communityRules = RandomGenerator.paragraph({ sentences: 3 });

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: communityDisplayTitle,
          description: communityDescription,
          rules: communityRules,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3 & 4: Verify community creation and validate returned data
  TestValidator.predicate(
    "community ID should be a valid UUID",
    community.id.length > 0,
  );
  TestValidator.equals(
    "community name should match input",
    community.name,
    communityName,
  );
  TestValidator.equals(
    "community display title should match input",
    community.display_title,
    communityDisplayTitle,
  );
  TestValidator.equals(
    "community description should match input",
    community.description,
    communityDescription,
  );
  TestValidator.equals(
    "community rules should match input",
    community.rules,
    communityRules,
  );

  // Step 5: Confirm moderator is assigned as creator
  TestValidator.equals(
    "creator moderator ID should match authenticated moderator",
    community.creator_member_id,
    moderator.id,
  );

  // Validate initial community state
  TestValidator.equals(
    "new community should start with zero subscribers",
    community.subscriber_count,
    0,
  );
  TestValidator.equals(
    "new community should start with zero posts",
    community.post_count,
    0,
  );
  TestValidator.predicate(
    "community should not be deleted",
    community.deleted_at === null || community.deleted_at === undefined,
  );
  TestValidator.predicate(
    "created_at timestamp should be set",
    community.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp should be set",
    community.updated_at.length > 0,
  );
}
