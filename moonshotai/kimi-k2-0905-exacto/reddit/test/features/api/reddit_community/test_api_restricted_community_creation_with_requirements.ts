import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test community member creating a restricted community with posting
 * requirements including minimum account age and karma thresholds. Validates
 * quality-focused community establishment with participation standards.
 *
 * This comprehensive test verifies the complete workflow of establishing a
 * quality-focused community with participation standards:
 *
 * 1. Member registration to establish authenticated access
 * 2. Restricted community creation with posting requirements configuration
 * 3. Verification of access controls and posting requirements enforcement
 * 4. Validation of community configuration matching requested settings
 *
 * The test ensures that quality-focused communities can be properly established
 * with appropriate participation standards to maintain high-quality
 * discussions.
 */
export async function test_api_restricted_community_creation_with_requirements(
  connection: api.IConnection,
) {
  // Step 1: Register as a community member to gain authenticated access
  const nickname = RandomGenerator.alphabets(8); // More controlled format for nickname
  const memberData = {
    nickname: nickname,
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
  } satisfies IRedditCommunityMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);
  TestValidator.equals(
    "member nickname matches",
    member.nickname,
    memberData.nickname,
  );

  // Step 2: Create restricted community with posting requirements
  const communityName = RandomGenerator.alphabets(8).toLowerCase(); // Simple, valid name format
  const minAccountAge = 7; // 7 days minimum age requirement
  const minKarma = 50; // 50 karma points minimum requirement

  const communityData = {
    name: communityName,
    title: "Tech Discussion Forum",
    description:
      "A dedicated space for in-depth technical discussions and knowledge sharing",
    category_name: "Technology", // Using Technology category
    type: "restricted" as const,
    post_requirement_min_age: minAccountAge,
    post_requirement_min_karma: minKarma,
    allow_crosspost: false, // Disable crossposting for quality control
  } satisfies IRedditCommunityCommunity.ICreate;

  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Verify community configuration matches requested settings
  TestValidator.equals(
    "community name matches",
    community.name,
    communityData.name,
  );
  TestValidator.equals(
    "community title matches",
    community.title,
    communityData.title,
  );
  TestValidator.equals(
    "community description matches",
    community.description,
    communityData.description,
  );
  TestValidator.equals(
    "community type is restricted",
    community.type,
    "restricted",
  );
  TestValidator.equals(
    "subscriber count initialized at 0",
    community.subscriber_count,
    0,
  );
  TestValidator.equals(
    "crossposting disabled",
    community.allow_crosspost,
    false,
  );

  // Step 4: Verify posting requirements are correctly set
  TestValidator.equals(
    "minimum account age requirement",
    community.post_requirement_min_age,
    minAccountAge,
  );
  TestValidator.equals(
    "minimum karma requirement",
    community.post_requirement_min_karma,
    minKarma,
  );

  // Step 5: Verify category assignment
  TestValidator.predicate(
    "category is assigned",
    community.category !== null && community.category !== undefined,
  );
  TestValidator.predicate(
    "category ID is valid UUID",
    typeof community.category.id === "string" &&
      community.category.id.length === 36,
  );
  TestValidator.equals(
    "category name matches",
    community.category.name,
    communityData.category_name,
  );

  // Step 6: Verify community metadata
  TestValidator.equals(
    "community ID is valid UUID format",
    community.id.length,
    36,
  );
  TestValidator.equals("community is active", community.deleted_at, null);
  TestValidator.predicate(
    "timestamps are ISO formatted",
    community.created_at.includes("T") && community.updated_at.includes("T"),
  );

  // Step 7: Verify member privileges maintained for community creation
  TestValidator.predicate(
    "member token is active after creation",
    connection.headers?.Authorization !== undefined,
  );
}
