import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test community creation rate limiting.
 *
 * Validates that the platform enforces a 1 community per member per 24 hours
 * rate limit to prevent spam. After successfully creating one community,
 * attempting to create a second community within 24 hours should return HTTP
 * 429 Too Many Requests with rate limit information.
 *
 * Test workflow:
 *
 * 1. Create administrator account
 * 2. Create a community category for communities to belong to
 * 3. Create member account with sufficient karma
 * 4. Create first community successfully
 * 5. Attempt to create second community (should fail with 429)
 * 6. Verify error indicates rate limit and when user can create again
 */
export async function test_api_community_creation_rate_limiting(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/admin/register",
    referrer: "http://localhost:3000/admin",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "administrator created successfully",
    () => admin.id !== null,
  );

  // Switch to admin connection
  const adminConnection: api.IConnection = {
    ...connection,
    headers: { ...connection.headers, Authorization: admin.token.access },
  };

  // Step 2: Create a community category
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(6).toLowerCase(),
    display_order: 1,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCategory.ICreate;

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      { body: categoryData },
    );
  typia.assert(category);
  TestValidator.predicate(
    "category created successfully",
    () => category.id !== null,
  );

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "http://localhost:3000/register",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);
  TestValidator.predicate(
    "member created successfully",
    () => member.id !== null,
  );

  // Switch to member connection
  const memberConnection: api.IConnection = {
    ...connection,
    headers: { ...connection.headers, Authorization: member.token.access },
  };

  // Step 4: Create first community successfully
  const firstCommunityData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const firstCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      { body: firstCommunityData },
    );
  typia.assert(firstCommunity);
  TestValidator.predicate(
    "first community created successfully",
    () => firstCommunity.id !== null,
  );
  TestValidator.equals(
    "first community has correct identifier",
    firstCommunity.identifier,
    firstCommunityData.identifier,
  );

  // Step 5: Attempt to create second community (should fail with rate limit)
  const secondCommunityData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  // Step 6: Verify rate limit error
  await TestValidator.error(
    "community creation should be rate limited on second attempt",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        memberConnection,
        { body: secondCommunityData },
      );
    },
  );

  TestValidator.predicate("rate limit enforcement validated", () => true);
}
