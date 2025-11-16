import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test community name length validation (3-100 characters).
 *
 * Validates that the community creation endpoint properly enforces name length
 * constraints. Tests boundary cases:
 *
 * - 2 characters (too short) - should fail with HTTP 400
 * - 3 characters (valid minimum) - should succeed
 * - 100 characters (valid maximum) - should succeed
 * - 101 characters (too long) - should fail with HTTP 400
 * - Names with spaces and special characters within valid range - should succeed
 *
 * This ensures the API correctly validates community names and rejects invalid
 * inputs.
 */
export async function test_api_community_creation_name_length_constraints(
  connection: api.IConnection,
) {
  // Setup: Create administrator for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphabets(12),
      username: RandomGenerator.alphabets(10),
      name: RandomGenerator.name(),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminJoin);

  // Create a category for community creation
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Test Category",
          slug: "test-category-" + RandomGenerator.alphaNumeric(5),
          display_order: 0,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Setup: Create member for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(10),
      password: RandomGenerator.alphabets(12),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberJoin);

  // Test 1: Name too short (2 characters) - should fail
  await TestValidator.error(
    "community creation should fail with 2-character name",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: "ab",
            identifier: "test-" + RandomGenerator.alphaNumeric(8),
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: category.slug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Test 2: Name at minimum valid length (3 characters) - should succeed
  const community1 =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "abc",
          identifier: "test-" + RandomGenerator.alphaNumeric(8),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  TestValidator.equals(
    "3-character name should succeed",
    community1.name,
    "abc",
  );

  // Test 3: Name with spaces and special characters (within valid range) - should succeed
  const nameWithSpaces = "Tech News & Updates";
  const community2 =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: nameWithSpaces,
          identifier: "test-" + RandomGenerator.alphaNumeric(8),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  TestValidator.equals(
    "name with spaces and special characters should succeed",
    community2.name,
    nameWithSpaces,
  );

  // Test 4: Name at maximum valid length (100 characters) - should succeed
  const name100 = "A" + RandomGenerator.alphabets(99);
  const community3 =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: name100,
          identifier: "test-" + RandomGenerator.alphaNumeric(8),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community3);
  TestValidator.equals(
    "100-character name should succeed",
    community3.name,
    name100,
  );
  TestValidator.predicate("name length is exactly 100", name100.length === 100);

  // Test 5: Name too long (101 characters) - should fail
  const name101 = "A" + RandomGenerator.alphabets(100);
  await TestValidator.error(
    "community creation should fail with 101-character name",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: name101,
            identifier: "test-" + RandomGenerator.alphaNumeric(8),
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: category.slug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );
}
