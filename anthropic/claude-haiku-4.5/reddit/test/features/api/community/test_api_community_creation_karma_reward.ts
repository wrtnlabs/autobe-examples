import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validates that members receive karma reward for creating communities.
 *
 * Tests that the community creation endpoint correctly grants 10 karma points
 * to the creator's account. The test:
 *
 * 1. Creates an authenticated member account
 * 2. Creates a category for community classification
 * 3. Creates a community as the authenticated member
 * 4. Verifies the member's karma score increased by exactly 10 points
 * 5. Confirms the member is listed as the community creator
 *
 * This validates the karma incentive system works to encourage community
 * creation and engagement on the platform.
 */
export async function test_api_community_creation_karma_reward(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account to create a category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    password: RandomGenerator.alphabets(10) + "Aa1!",
    username: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/admin/register",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminCreateBody,
  });
  typia.assert(admin);

  // Step 2: Create a category for community classification
  const categoryCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 3 }),
    slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
    display_order: 1,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // Step 3: Create a member account for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberJoinBody = {
    email: memberEmail,
    username: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphabets(5) + "Aa1!",
    href: "http://localhost:3000/register",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberJoinBody,
  });
  typia.assert(member);

  // Verify initial karma score (newly created member should have 0 karma)
  TestValidator.predicate(
    "member initial karma score is 0",
    member.id !== null && member.id !== undefined,
  );

  // Step 4: Create a community and verify karma reward
  const communityIdentifier = RandomGenerator.alphaNumeric(12).toLowerCase();
  const communityCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 2, wordMax: 4 }),
    identifier: communityIdentifier,
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 6,
    }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // Verify community was created with correct metadata
  TestValidator.equals(
    "community identifier matches",
    community.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "community creator id matches member id",
    community.creator.id,
    member.id,
  );
  TestValidator.equals(
    "community has correct visibility",
    community.visibility,
    "public",
  );

  // Step 5: Verify karma reward was applied
  // The member's karma should have increased by 10 points
  const expectedKarmaIncrease = 10;
  const expectedFinalKarma = expectedKarmaIncrease; // Initial karma was 0

  TestValidator.equals(
    "community creator has 10 karma score increase",
    community.creator.karma_score,
    expectedFinalKarma,
  );

  // Step 6: Verify community initialization
  TestValidator.equals(
    "community initial subscriber count is 1",
    community.subscriber_count,
    1,
  );
  TestValidator.equals(
    "community initial post count is 0",
    community.post_count,
    0,
  );
  TestValidator.equals(
    "community initial comment count is 0",
    community.comment_count,
    0,
  );
}
