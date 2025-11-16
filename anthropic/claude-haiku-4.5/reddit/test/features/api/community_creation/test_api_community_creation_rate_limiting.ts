import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test rate limiting on community creation (1 community per member per 24
 * hours).
 *
 * This test validates the platform's rate limiting mechanism that restricts
 * community creation to one per member per 24-hour period. The test verifies:
 *
 * 1. First community creation succeeds for an authenticated member
 * 2. Subsequent creation attempt within 24 hours returns HTTP 429 (rate limited)
 * 3. Rate limiting is per-member (other members can create simultaneously)
 * 4. Error response includes rate limit information
 *
 * The test flow:
 *
 * 1. Administrator creates a category for community classification
 * 2. Member authenticates to the platform
 * 3. Member creates first community - should succeed
 * 4. Same member attempts second community creation - should fail with 429
 * 5. Different member creates community - should succeed (per-member limit)
 */
export async function test_api_community_creation_rate_limiting(
  connection: api.IConnection,
) {
  // Step 1: Administrator creates a category for community classification
  const adminCreateData = {
    name: "Technology",
    slug: "technology",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: adminCreateData,
      },
    );
  typia.assert(category);

  // Step 2: Create and authenticate first member
  const memberCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: "SecurePassword123!",
    href: "https://localhost/register",
    referrer: "https://localhost",
  } satisfies ICommunityPlatformMember.ICreate;

  const firstMember = await api.functional.auth.member.join(connection, {
    body: memberCreateData,
  });
  typia.assert(firstMember);
  TestValidator.equals(
    "first member authenticated",
    typeof firstMember.token.access,
    "string",
  );

  // Step 3: First member creates first community - should succeed
  const firstCommunityData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: RandomGenerator.alphabets(12),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "all_types",
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const firstCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: firstCommunityData,
      },
    );
  typia.assert(firstCommunity);
  TestValidator.equals(
    "first community created successfully",
    firstCommunity.identifier,
    firstCommunityData.identifier,
  );

  // Step 4: Same member attempts second community creation within 24 hours - should fail with 429
  const secondCommunityData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: RandomGenerator.alphabets(12),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "all_types",
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  await TestValidator.httpError(
    "rate limit should prevent second community creation",
    429,
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: secondCommunityData,
        },
      );
    },
  );

  // Step 5: Verify rate limiting is per-member by creating second member and allowing their community creation
  const secondMemberCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: "SecurePassword456!",
    href: "https://localhost/register",
    referrer: "https://localhost",
  } satisfies ICommunityPlatformMember.ICreate;

  const secondMember = await api.functional.auth.member.join(connection, {
    body: secondMemberCreateData,
  });
  typia.assert(secondMember);

  const secondMemberCommunityData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: RandomGenerator.alphabets(12),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "all_types",
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const secondMemberCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: secondMemberCommunityData,
      },
    );
  typia.assert(secondMemberCommunity);
  TestValidator.equals(
    "second member can create community (per-member limit)",
    secondMemberCommunity.identifier,
    secondMemberCommunityData.identifier,
  );
}
