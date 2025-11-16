import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test identifier length validation for community creation.
 *
 * This test validates that the community creation API properly enforces
 * identifier length constraints. Community identifiers must be between 3-32
 * characters, containing only lowercase letters, numbers, and underscores. The
 * test attempts to create communities with identifiers of varying lengths to
 * confirm that the API:
 *
 * 1. Rejects identifiers shorter than 3 characters
 * 2. Rejects identifiers longer than 32 characters
 * 3. Accepts identifiers within the valid 3-32 character range
 * 4. Properly validates the character pattern (lowercase alphanumeric and
 *    underscores)
 *
 * Prerequisites:
 *
 * - Create an administrator account for category creation
 * - Create a category for community classification
 * - Create a member account for community creation
 *
 * Test flow:
 *
 * 1. Register administrator and create a test category
 * 2. Register member user
 * 3. Attempt to create community with identifier too short (1-2 chars) - expect
 *    error
 * 4. Attempt to create community with identifier too long (33+ chars) - expect
 *    error
 * 5. Create communities with valid identifier lengths (3, 10, 32 chars) - expect
 *    success
 * 6. Verify created communities have correct identifiers and properties
 */
export async function test_api_community_creation_identifier_length_validation(
  connection: api.IConnection,
) {
  // 1. Create administrator account and category
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "TestPassword123!",
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
        name: "Test Administrator",
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create a test category
  const categoryName = RandomGenerator.name(2);
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categoryName.toLowerCase().replace(/\s+/g, "_"),
          display_order: 1,
          description: "Test category for identifier validation",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 2. Create member account for community creation
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `member_${RandomGenerator.alphaNumeric(6)}`,
        password: "TestPassword123!",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 3. Test with identifier too short (less than 3 characters)
  const tooShortIdentifier = "ab"; // 2 characters - should fail
  await TestValidator.error(
    "community creation should fail with identifier too short",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: "Short ID Community",
            identifier: tooShortIdentifier,
            description: "Test community with too short identifier",
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: category.slug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // 4. Test with identifier too long (more than 32 characters)
  const tooLongIdentifier = "a".repeat(33); // 33 characters - should fail
  await TestValidator.error(
    "community creation should fail with identifier too long",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: "Long ID Community",
            identifier: tooLongIdentifier,
            description: "Test community with too long identifier",
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: category.slug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // 5. Create communities with valid identifier lengths
  // Test with minimum valid length (3 characters)
  const minValidIdentifier = "abc"; // 3 characters - should succeed
  const minCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Minimum Valid Community",
          identifier: minValidIdentifier,
          description: "Test community with 3-character identifier",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(minCommunity);
  TestValidator.equals(
    "minimum valid identifier should be created correctly",
    minCommunity.identifier,
    minValidIdentifier,
  );

  // Test with mid-range valid length (10 characters)
  const midValidIdentifier = "mid_comm_1"; // 10 characters - should succeed
  const midCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Mid-Range Valid Community",
          identifier: midValidIdentifier,
          description: "Test community with 10-character identifier",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(midCommunity);
  TestValidator.equals(
    "mid-range valid identifier should be created correctly",
    midCommunity.identifier,
    midValidIdentifier,
  );

  // Test with maximum valid length (32 characters)
  const maxValidIdentifier = "a".repeat(32); // 32 characters - should succeed
  const maxCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Maximum Valid Community",
          identifier: maxValidIdentifier,
          description: "Test community with 32-character identifier",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(maxCommunity);
  TestValidator.equals(
    "maximum valid identifier should be created correctly",
    maxCommunity.identifier,
    maxValidIdentifier,
  );

  // 6. Verify all created communities have correct properties
  TestValidator.predicate(
    "minimum valid community should have correct name",
    minCommunity.name === "Minimum Valid Community",
  );
  TestValidator.predicate(
    "minimum valid community should have correct category",
    minCommunity.category.id === category.id,
  );

  TestValidator.predicate(
    "mid-range community should have correct visibility",
    midCommunity.visibility === "public",
  );
  TestValidator.predicate(
    "mid-range community should have correct post restrictions",
    midCommunity.post_creation_restriction === "open_to_all",
  );

  TestValidator.predicate(
    "maximum community should have at least 1 subscriber (creator)",
    maxCommunity.subscriber_count >= 1,
  );
  TestValidator.predicate(
    "maximum community identifier is within valid range",
    maxCommunity.identifier.length >= 3 && maxCommunity.identifier.length <= 32,
  );
}
