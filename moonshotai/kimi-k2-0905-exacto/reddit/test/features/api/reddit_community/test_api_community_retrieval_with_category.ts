import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test retrieval of a community with category information for comprehensive
 * discovery
 *
 * This test validates the community retrieval endpoint's ability to return
 * complete category information when accessing a specific community by name.
 * The test workflow includes member registration for authentication, community
 * creation with category assignment, and retrieval validation to ensure
 * category metadata is properly included in community responses for enhanced
 * discovery and browsing experiences.
 */
export async function test_api_community_retrieval_with_category(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account for community creation authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const newMember: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        nickname: RandomGenerator.name(),
        email: memberEmail,
        password: "SecurePassword123!",
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(newMember);
  TestValidator.predicate(
    "new member created successfully",
    newMember.id.length > 0,
  );

  // Step 2: Create a community with category assignment
  const communityName = `test_community_${RandomGenerator.alphabets(8)}`;
  const testCategoryName = "Technology"; // Using a realistic category name

  const communityData = {
    name: communityName,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
      wordMin: 3,
      wordMax: 7,
    }),
    category_name: testCategoryName,
    type: RandomGenerator.pick(["public", "restricted", "private"] as const),
    allow_crosspost: typia.random<boolean>(),
  } satisfies IRedditCommunityCommunity.ICreate;

  const createdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(createdCommunity);

  // Verify community was created with expected data
  TestValidator.equals(
    "community name matches",
    createdCommunity.name,
    communityName,
  );
  TestValidator.equals(
    "community type matches",
    createdCommunity.type,
    communityData.type,
  );
  TestValidator.predicate(
    "community has category",
    !!createdCommunity.category,
  );
  TestValidator.equals(
    "category name matches",
    createdCommunity.category.name,
    testCategoryName,
  );
  TestValidator.predicate(
    "category has valid id",
    !!createdCommunity.category.id,
  );

  // Step 3: Retrieve the community by name to validate complete information
  const retrievedCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.communities.at(connection, {
      communityName,
    });
  typia.assert(retrievedCommunity);

  // Comprehensive validation of retrieved community with category information
  TestValidator.equals(
    "retrieved community name matches",
    retrievedCommunity.name,
    communityName,
  );
  TestValidator.equals(
    "retrieved community title matches",
    retrievedCommunity.title,
    createdCommunity.title,
  );
  TestValidator.equals(
    "retrieved community description matches",
    retrievedCommunity.description,
    createdCommunity.description,
  );
  TestValidator.equals(
    "community type matches",
    retrievedCommunity.type,
    createdCommunity.type,
  );

  // Critical category validation - ensure category information is properly included
  TestValidator.predicate(
    "category is included",
    !!retrievedCommunity.category,
  );
  TestValidator.equals(
    "category name matches",
    retrievedCommunity.category.name,
    testCategoryName,
  );
  TestValidator.equals(
    "category id matches",
    retrievedCommunity.category.id,
    createdCommunity.category.id,
  );

  // Validate community-level properties that complement category information
  TestValidator.predicate(
    "subscriber count is non-negative",
    retrievedCommunity.subscriber_count >= 0,
  );
  TestValidator.predicate(
    "crosspost setting matches creation",
    retrievedCommunity.allow_crosspost === createdCommunity.allow_crosspost,
  );

  // Validate timestamps are present and properly formatted
  TestValidator.predicate(
    "community has created_at timestamp",
    !!retrievedCommunity.created_at,
  );
  TestValidator.predicate(
    "community has updated_at timestamp",
    !!retrievedCommunity.updated_at,
  );
  TestValidator.predicate(
    "deleted_at is null for active community",
    retrievedCommunity.deleted_at === null,
  );

  // Final assertion: retrieved community exactly matches created community
  TestValidator.equals(
    "retrieved community matches created community",
    retrievedCommunity,
    createdCommunity,
  );
}
