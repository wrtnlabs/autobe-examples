import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaScore";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that the karma score response adheres to the expected schema with all
 * required fields present.
 *
 * This test validates the complete karma score response structure by:
 *
 * 1. Creating a member account through authentication
 * 2. Setting up a category for community classification
 * 3. Creating a community to establish member presence
 * 4. Retrieving karma scores for the created member
 * 5. Validating response structure includes all required fields with correct types
 * 6. Ensuring no extra undocumented fields appear in the response
 * 7. Verifying field naming consistency and proper type validation
 */
export async function test_api_karma_score_response_structure_validation(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(8),
    password: "SecurePassword123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const memberResponse = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(memberResponse);

  const memberId = memberResponse.id;
  TestValidator.equals("member ID exists", typeof memberId, "string");

  // Step 2: Create administrator account and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: "AdminPassword123!",
    username: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const adminResponse = await api.functional.auth.administrator.join(
    connection,
    {
      body: adminData,
    },
  );
  typia.assert(adminResponse);

  // Step 3: Create a category
  const categoryData = {
    name: "Technology",
    slug: "technology",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const categoryResponse =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      { body: categoryData },
    );
  typia.assert(categoryResponse);

  // Step 4: Login back as member and create a community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "SecurePassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const communityData = {
    name: "Tech Discussions",
    identifier: `tech_${RandomGenerator.alphaNumeric(6)}`,
    description: "A place to discuss technology topics",
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: categoryResponse.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityResponse =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityData },
    );
  typia.assert(communityResponse);

  // Step 5: Retrieve karma scores for the member
  const karmaScoreResponse =
    await api.functional.communityPlatform.member.members.karmaScores.at(
      connection,
      { memberId },
    );
  typia.assert(karmaScoreResponse);

  // Step 6: Validate response structure - all required fields present
  TestValidator.predicate(
    "karma score has id field",
    karmaScoreResponse.id !== null && karmaScoreResponse.id !== undefined,
  );

  TestValidator.predicate(
    "karma score id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      karmaScoreResponse.id,
    ),
  );

  TestValidator.equals(
    "community_platform_member_id matches created member",
    karmaScoreResponse.community_platform_member_id,
    memberId,
  );

  TestValidator.predicate(
    "post_karma is non-negative integer",
    typeof karmaScoreResponse.post_karma === "number" &&
      karmaScoreResponse.post_karma >= 0 &&
      Number.isInteger(karmaScoreResponse.post_karma),
  );

  TestValidator.predicate(
    "comment_karma is non-negative integer",
    typeof karmaScoreResponse.comment_karma === "number" &&
      karmaScoreResponse.comment_karma >= 0 &&
      Number.isInteger(karmaScoreResponse.comment_karma),
  );

  TestValidator.predicate(
    "total_karma is non-negative integer",
    typeof karmaScoreResponse.total_karma === "number" &&
      karmaScoreResponse.total_karma >= 0 &&
      Number.isInteger(karmaScoreResponse.total_karma),
  );

  TestValidator.equals(
    "total_karma equals sum of post and comment karma",
    karmaScoreResponse.total_karma,
    karmaScoreResponse.post_karma + karmaScoreResponse.comment_karma,
  );

  TestValidator.predicate(
    "created_at is ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(karmaScoreResponse.created_at),
  );

  TestValidator.predicate(
    "updated_at is ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(karmaScoreResponse.updated_at),
  );

  // Step 7: Validate field types and structure
  const expectedFields = [
    "id",
    "community_platform_member_id",
    "post_karma",
    "comment_karma",
    "total_karma",
    "created_at",
    "updated_at",
  ];
  const actualFields = Object.keys(karmaScoreResponse);

  TestValidator.predicate(
    "response has exactly expected number of properties",
    actualFields.length === expectedFields.length,
  );

  TestValidator.predicate(
    "response contains all required fields",
    expectedFields.every((key) => key in karmaScoreResponse),
  );

  TestValidator.predicate(
    "no extra undocumented fields in response",
    !actualFields.some((key) => !expectedFields.includes(key)),
  );
}
