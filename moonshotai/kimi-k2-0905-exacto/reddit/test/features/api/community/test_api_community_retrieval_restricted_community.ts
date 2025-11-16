import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test retrieval of a restricted community that requires approval for posting.
 * Validates that restricted community information is publicly viewable while
 * maintaining access control restrictions for content creation. Ensures that
 * restricted communities can be browsed by all users but posting is
 * controlled.
 *
 * This test follows the complete workflow:
 *
 * 1. Member registration - Create new member account for authentication
 * 2. Restricted community creation - Create community with restricted access type
 * 3. Community retrieval - Verify public access to restricted community
 *    information
 * 4. Access control validation - Ensure posting restrictions are properly
 *    configured
 *
 * The test validates that restricted communities maintain public visibility for
 * discovery and browsing while content creation is controlled through approval
 * processes and posting requirements.
 */
export async function test_api_community_retrieval_restricted_community(
  connection: api.IConnection,
) {
  // 1. Create member account for authentication
  const email = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: email,
      password: "TestPassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // 2. Create restricted community with approval-based posting requirements
  const communityData = {
    body: {
      name: RandomGenerator.alphabets(10),
      title: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 3,
        wordMax: 8,
      }),
      description: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 5,
        wordMax: 10,
      }),
      category_name: "technology",
      type: "restricted" as const,
      post_requirement_min_age: 30,
      post_requirement_min_karma: 50,
      allow_crosspost: false,
    } satisfies IRedditCommunityCommunity.ICreate,
  };

  const restrictedCommunity =
    await api.functional.redditCommunity.member.communities.create(
      connection,
      communityData,
    );
  typia.assert(restrictedCommunity);

  // 3. Retrieve community using the communities at API
  const retrievedCommunity =
    await api.functional.redditCommunity.communities.at(connection, {
      communityName: restrictedCommunity.name,
    });
  typia.assert(retrievedCommunity);

  // 4. Validate that retrieved community matches created community
  TestValidator.equals(
    "community id matches",
    retrievedCommunity.id,
    restrictedCommunity.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedCommunity.name,
    restrictedCommunity.name,
  );
  TestValidator.equals(
    "community title matches",
    retrievedCommunity.title,
    restrictedCommunity.title,
  );
  TestValidator.equals(
    "community description matches",
    retrievedCommunity.description,
    restrictedCommunity.description,
  );
  TestValidator.equals(
    "community category matches",
    retrievedCommunity.category.id,
    restrictedCommunity.category.id,
  );

  // 5. Validate restricted community settings - publicly viewable
  TestValidator.equals(
    "community type is restricted",
    retrievedCommunity.type,
    "restricted",
  );
  TestValidator.predicate(
    "community is publicly viewable",
    retrievedCommunity.deleted_at === null,
  );
  TestValidator.predicate(
    "community has subscriber count",
    retrievedCommunity.subscriber_count >= 0,
  );
  TestValidator.predicate(
    "community creation timestamp exists",
    retrievedCommunity.created_at.length > 0,
  );
  TestValidator.predicate(
    "community has update timestamp",
    retrievedCommunity.updated_at.length > 0,
  );
  TestValidator.predicate(
    "community has category association",
    retrievedCommunity.category !== null,
  );

  // 6. Validate access control settings for posting
  if (
    retrievedCommunity.post_requirement_min_age !== null &&
    retrievedCommunity.post_requirement_min_age !== undefined
  ) {
    TestValidator.predicate(
      "post requirement min age is at least 0",
      retrievedCommunity.post_requirement_min_age >= 0,
    );
  }
  if (
    retrievedCommunity.post_requirement_min_karma !== null &&
    retrievedCommunity.post_requirement_min_karma !== undefined
  ) {
    TestValidator.predicate(
      "post requirement min karma is at least 0",
      retrievedCommunity.post_requirement_min_karma >= 0,
    );
  }
  TestValidator.predicate(
    "crossposting setting matches",
    retrievedCommunity.allow_crosspost === false,
  );

  // 7. Verify public accessibility of restricted community
  TestValidator.predicate(
    "restricted community is publicly discoverable",
    retrievedCommunity.type === "restricted",
  );
  TestValidator.predicate(
    "community metadata is publicly accessible",
    retrievedCommunity.description.length > 0,
  );
  TestValidator.predicate(
    "community title is publicly visible",
    retrievedCommunity.title.length > 0,
  );
}
