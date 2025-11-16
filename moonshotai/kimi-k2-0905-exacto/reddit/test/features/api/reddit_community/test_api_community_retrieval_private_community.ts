import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test retrieval of a private community information that maintains
 * invitation-only access. Validates that private community metadata is properly
 * returned while respecting privacy controls.
 */
export async function test_api_community_retrieval_private_community(
  connection: api.IConnection,
) {
  // Create member account for authentication
  const memberCreateBody = {
    nickname: RandomGenerator.alphabets(7),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
  } satisfies IRedditCommunityMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberCreateBody,
  });
  typia.assert(member);

  // Create private community
  const communityCreateBody = {
    name: RandomGenerator.alphabets(8),
    title: RandomGenerator.name(1),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
    category_name: "business", // Using a standard category name
    type: "private" as const,
    allow_crosspost: false,
    post_requirement_min_age: 30,
    post_requirement_min_karma: 50,
  } satisfies IRedditCommunityCommunity.ICreate;

  const privateCommunity =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: communityCreateBody,
    });
  typia.assert(privateCommunity);

  // Retrieve private community details
  const retrievedCommunity =
    await api.functional.redditCommunity.communities.at(connection, {
      communityName: privateCommunity.name,
    });
  typia.assert(retrievedCommunity);

  // Validate private community properties
  TestValidator.equals(
    "community name matches",
    retrievedCommunity.name,
    privateCommunity.name,
  );
  TestValidator.equals(
    "community title matches",
    retrievedCommunity.title,
    privateCommunity.title,
  );
  TestValidator.equals(
    "community type is private",
    retrievedCommunity.type,
    "private",
  );
  TestValidator.notEquals(
    "crossposting disabled for private communities",
    retrievedCommunity.allow_crosspost,
    true,
  );

  // Validate access configuration
  TestValidator.equals(
    "min age requirement matches",
    retrievedCommunity.post_requirement_min_age,
    30,
  );
  TestValidator.equals(
    "min karma requirement matches",
    retrievedCommunity.post_requirement_min_karma,
    50,
  );

  // Validate category consistency
  TestValidator.equals(
    "category ID matches",
    retrievedCommunity.category.id,
    privateCommunity.category.id,
  );
  TestValidator.equals(
    "category name matches",
    retrievedCommunity.category.name,
    "business",
  );

  // Validate timestamps are present (basic presence check - typia handles format validation)
  TestValidator.predicate(
    "created_at is present",
    retrievedCommunity.created_at !== null &&
      retrievedCommunity.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is present",
    retrievedCommunity.updated_at !== null &&
      retrievedCommunity.updated_at !== undefined,
  );
  TestValidator.predicate(
    "no deletion timestamp",
    retrievedCommunity.deleted_at === null,
  );
}
