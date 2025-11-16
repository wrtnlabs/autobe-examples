import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that community description is optional and can be omitted or provided as
 * null.
 *
 * This test validates that the description field in community creation is truly
 * optional. The scenario tests three cases: providing a description, omitting
 * the description entirely, and explicitly setting description to null. All
 * three should succeed with HTTP 201 response and return valid community
 * objects.
 *
 * Test workflow:
 *
 * 1. Authenticate as a member to get authorization
 * 2. Create a category for community classification
 * 3. Create community WITH description provided
 * 4. Create community WITHOUT description (field omitted)
 * 5. Create community WITH description explicitly set to null
 * 6. Validate all communities were created successfully
 * 7. Assert response structure with optional description handling
 */
export async function test_api_community_creation_description_optional(
  connection: api.IConnection,
) {
  // Step 1: Register member for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(10),
    password: "SecurePassword123!",
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(memberAuth);

  // Step 2: Create administrator and category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    username: RandomGenerator.alphabets(10),
    password: "AdminPassword123!",
    name: RandomGenerator.name(2),
    href: "https://example.com/admin",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(adminAuth);

  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Switch back to member context for community creation
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "SecurePassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 3: Create community WITH description provided
  const uniqueSuffix1 = RandomGenerator.alphaNumeric(6);
  const communityWithDescription = {
    name: RandomGenerator.name(3),
    identifier: `comm_${uniqueSuffix1}`.toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdWithDesc =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityWithDescription,
      },
    );
  typia.assert(createdWithDesc);
  TestValidator.equals(
    "community with description should have description",
    createdWithDesc.description,
    communityWithDescription.description,
  );

  // Step 4: Create community WITHOUT description (omitted)
  const uniqueSuffix2 = RandomGenerator.alphaNumeric(6);
  const communityWithoutDescription = {
    name: RandomGenerator.name(3),
    identifier: `comm_${uniqueSuffix2}`.toLowerCase(),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdWithoutDesc =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityWithoutDescription,
      },
    );
  typia.assert(createdWithoutDesc);
  TestValidator.predicate(
    "community without description should have null or undefined description",
    createdWithoutDesc.description === null ||
      createdWithoutDesc.description === undefined,
  );

  // Step 5: Create community WITH description explicitly set to null
  const uniqueSuffix3 = RandomGenerator.alphaNumeric(6);
  const communityWithNullDescription = {
    name: RandomGenerator.name(3),
    identifier: `comm_${uniqueSuffix3}`.toLowerCase(),
    description: null,
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdWithNull =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityWithNullDescription,
      },
    );
  typia.assert(createdWithNull);
  TestValidator.predicate(
    "community with null description should have null or undefined description",
    createdWithNull.description === null ||
      createdWithNull.description === undefined,
  );

  // Step 6: Verify all communities have required fields
  TestValidator.predicate(
    "community with description has valid ID",
    createdWithDesc.id !== undefined && createdWithDesc.id.length > 0,
  );
  TestValidator.predicate(
    "community without description has valid ID",
    createdWithoutDesc.id !== undefined && createdWithoutDesc.id.length > 0,
  );
  TestValidator.predicate(
    "community with null description has valid ID",
    createdWithNull.id !== undefined && createdWithNull.id.length > 0,
  );

  // Step 7: Verify response structure for all three cases
  TestValidator.equals(
    "community with description has matching name",
    createdWithDesc.name,
    communityWithDescription.name,
  );
  TestValidator.equals(
    "community without description has matching name",
    createdWithoutDesc.name,
    communityWithoutDescription.name,
  );
  TestValidator.equals(
    "community with null description has matching name",
    createdWithNull.name,
    communityWithNullDescription.name,
  );
}
