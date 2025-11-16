import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test error handling when attempting to create a community with a duplicate
 * identifier.
 *
 * This test validates that the API properly enforces the uniqueness constraint
 * on community identifiers globally across the platform. It creates a member
 * account, establishes a category, creates the first community successfully,
 * then attempts to create a second community with the same identifier and
 * expects a 409 Conflict error response.
 *
 * The test covers:
 *
 * 1. Administrator account creation for category management
 * 2. Category creation for community classification
 * 3. Member account creation for authentication
 * 4. Successful creation of the first community
 * 5. Duplicate identifier rejection with 409 Conflict error response
 * 6. Confirmation that the system prevents identifier collisions
 */
export async function test_api_community_creation_duplicate_identifier(
  connection: api.IConnection,
) {
  // 1. Create administrator account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    username: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // 2. Create category as administrator
  const categoryData = {
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 4 }),
    slug: RandomGenerator.alphabets(10).toLowerCase(),
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      { body: categoryData },
    );
  typia.assert(category);

  // 3. Create member account for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphabets(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // 4. Create the first community successfully
  const communityIdentifier = RandomGenerator.alphabets(10).toLowerCase();
  const firstCommunityData = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 5 }),
    identifier: communityIdentifier,
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const firstCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: firstCommunityData },
    );
  typia.assert(firstCommunity);
  TestValidator.equals(
    "first community identifier matches input",
    firstCommunity.identifier,
    communityIdentifier,
  );

  // 5. Attempt to create second community with same identifier
  const secondCommunityData = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 5 }),
    identifier: communityIdentifier, // Same identifier as first community
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  // 6. Validate that API returns 409 Conflict error for duplicate identifier
  await TestValidator.httpError(
    "duplicate identifier should return 409 conflict",
    409,
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: secondCommunityData,
        },
      );
    },
  );

  // 7. Verify first community still exists with correct identifier
  TestValidator.predicate(
    "first community still exists and maintains unique identifier",
    firstCommunity.id !== null &&
      firstCommunity.identifier === communityIdentifier,
  );
}
