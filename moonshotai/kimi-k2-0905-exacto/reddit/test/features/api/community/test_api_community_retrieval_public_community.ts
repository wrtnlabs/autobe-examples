import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test successful retrieval of a public community's detailed information.
 *
 * This test validates that community data including name, title, description,
 * type, subscriber count, and configuration settings are properly returned.
 * Ensures public communities are accessible to all platform users and that all
 * metadata fields are correctly populated.
 *
 * Test flow:
 *
 * 1. Create a new member account for authentication
 * 2. Create a public community with comprehensive metadata including:
 *
 *    - Unique name and title
 *    - Detailed description
 *    - Public access type
 *    - Optional posting requirements
 *    - Crossposting settings
 * 3. Retrieve the community using its unique name identifier
 * 4. Validate that all community fields match the creation data
 * 5. Verify community statistics and timestamps are properly set
 * 6. Ensure the community is accessible in public retrieval scenarios
 * 7. Test retrieval of non-existent community for error handling
 */
export async function test_api_community_retrieval_public_community(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a public community with comprehensive metadata
  const communityName = RandomGenerator.alphabets(8).toLowerCase();
  const communityTitle = RandomGenerator.paragraph({ sentences: 4 });
  const communityDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 3,
    sentenceMax: 6,
  });

  const createCommunityBody = {
    name: communityName,
    title: communityTitle,
    description: communityDescription,
    category_name: RandomGenerator.pick([
      "Technology",
      "Gaming",
      "Music",
      "Sports",
      "Food",
      "Travel",
    ] as const),
    type: "public" as const,
    post_requirement_min_age: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<365>
    >(),
    post_requirement_min_karma: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<1000>
    >(),
    allow_crosspost: typia.random<boolean>({}),
  } satisfies IRedditCommunityCommunity.ICreate;

  const createdCommunity =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: createCommunityBody,
    });
  typia.assert(createdCommunity);

  // Step 3: Retrieve the community using its unique name
  const retrievedCommunity =
    await api.functional.redditCommunity.communities.at(connection, {
      communityName: communityName,
    });
  typia.assert(retrievedCommunity);

  // Step 4: Validate all community fields match creation data
  TestValidator.equals(
    "community name matches",
    retrievedCommunity.name,
    communityName,
  );
  TestValidator.equals(
    "community title matches",
    retrievedCommunity.title,
    communityTitle,
  );
  TestValidator.equals(
    "community description matches",
    retrievedCommunity.description,
    communityDescription,
  );
  TestValidator.equals(
    "community type is public",
    retrievedCommunity.type,
    "public",
  );

  // Step 5: Validate community configuration settings
  TestValidator.equals(
    "post requirement age matches",
    retrievedCommunity.post_requirement_min_age,
    createCommunityBody.post_requirement_min_age,
  );
  TestValidator.equals(
    "post requirement karma matches",
    retrievedCommunity.post_requirement_min_karma,
    createCommunityBody.post_requirement_min_karma,
  );
  TestValidator.equals(
    "crosspost setting matches",
    retrievedCommunity.allow_crosspost,
    createCommunityBody.allow_crosspost,
  );

  // Step 6: Validate community metadata and statistics
  TestValidator.predicate(
    "subscriber count is non-negative",
    retrievedCommunity.subscriber_count >= 0,
  );
  TestValidator.predicate(
    "subscriber count is integer",
    Number.isInteger(retrievedCommunity.subscriber_count),
  );
  TestValidator.notEquals(
    "category is defined",
    retrievedCommunity.category,
    null,
  );
  TestValidator.predicate(
    "category has valid structure",
    !!retrievedCommunity.category && !!(retrievedCommunity.category as any).id,
  );
  TestValidator.notEquals(
    "created_at is defined",
    retrievedCommunity.created_at,
    null,
  );
  TestValidator.notEquals(
    "updated_at is defined",
    retrievedCommunity.updated_at,
    null,
  );
  TestValidator.equals(
    "deleted_at is null for active communities",
    retrievedCommunity.deleted_at,
    null,
  );

  // Step 7: Validate timestamps and audit trail
  const createdAt = new Date(retrievedCommunity.created_at);
  const updatedAt = new Date(retrievedCommunity.updated_at);
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(updatedAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at equals or after created_at",
    updatedAt >= createdAt,
  );
  TestValidator.predicate(
    "timestamps are recent",
    Date.now() - createdAt.getTime() < 60000,
  ); // Within 1 minute

  // Step 8: Test retrieval of non-existent community for error handling
  await TestValidator.error(
    "should fail to retrieve non-existent community",
    async () => {
      await api.functional.redditCommunity.communities.at(connection, {
        communityName: RandomGenerator.alphabets(20), // Unlikely to exist
      });
    },
  );
}
