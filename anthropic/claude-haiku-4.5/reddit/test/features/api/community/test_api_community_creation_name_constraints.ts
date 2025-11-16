import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_creation_name_constraints(
  connection: api.IConnection,
) {
  // Setup: Create administrator and member accounts
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(8),
      name: RandomGenerator.name(),
      href: "http://localhost/admin",
      referrer: "http://localhost",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Create a category for community assignment
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: RandomGenerator.alphaNumeric(10),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Setup: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(12),
      href: "http://localhost/register",
      referrer: "http://localhost",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Test 1: Valid name at minimum length (3 characters)
  const minNameCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "ABC",
          identifier: RandomGenerator.alphaNumeric(10),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(minNameCommunity);
  TestValidator.equals(
    "minimum valid name created",
    minNameCommunity.name,
    "ABC",
  );

  // Test 2: Valid name at maximum length (100 characters)
  const maxName = RandomGenerator.alphabets(100);
  const maxNameCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: maxName,
          identifier: RandomGenerator.alphaNumeric(10),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(maxNameCommunity);
  TestValidator.equals(
    "maximum valid name length",
    maxNameCommunity.name.length,
    100,
  );

  // Test 3: Valid name with spaces
  const spaceNameCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "My Tech Community",
          identifier: RandomGenerator.alphaNumeric(10),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(spaceNameCommunity);
  TestValidator.equals(
    "name with spaces created",
    spaceNameCommunity.name,
    "My Tech Community",
  );

  // Test 4: Valid name with special characters
  const specialNameCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech & AI (2024)",
          identifier: RandomGenerator.alphaNumeric(10),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(specialNameCommunity);
  TestValidator.equals(
    "name with special characters created",
    specialNameCommunity.name,
    "Tech & AI (2024)",
  );

  // Test 5: Too short name (2 characters) should fail
  await TestValidator.error(
    "name too short (2 chars) should be rejected",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: "AB",
            identifier: RandomGenerator.alphaNumeric(10),
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: category.slug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Test 6: Too short name (1 character) should fail
  await TestValidator.error(
    "name too short (1 char) should be rejected",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: "A",
            identifier: RandomGenerator.alphaNumeric(10),
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: category.slug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Test 7: Too long name (101 characters) should fail
  const tooLongName = RandomGenerator.alphabets(101);
  await TestValidator.error(
    "name too long (101 chars) should be rejected",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: tooLongName,
            identifier: RandomGenerator.alphaNumeric(10),
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: category.slug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Test 8: Duplicate names are allowed (no global uniqueness requirement)
  const duplicateName = "Shared Community Name";
  const duplicateCommunity1 =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: duplicateName,
          identifier: RandomGenerator.alphaNumeric(10),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(duplicateCommunity1);

  const duplicateCommunity2 =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: duplicateName,
          identifier: RandomGenerator.alphaNumeric(10),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(duplicateCommunity2);

  TestValidator.equals(
    "multiple communities with same name allowed",
    duplicateCommunity1.name,
    duplicateCommunity2.name,
  );
  TestValidator.notEquals(
    "duplicate communities have different IDs",
    duplicateCommunity1.id,
    duplicateCommunity2.id,
  );

  // Test 9: Empty string name should fail
  await TestValidator.error(
    "empty string name should be rejected",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: "",
            identifier: RandomGenerator.alphaNumeric(10),
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: category.slug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Test 10: Name with various valid characters
  const complexNameCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "C++ Programming @ 2024!",
          identifier: RandomGenerator.alphaNumeric(10),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(complexNameCommunity);
  TestValidator.equals(
    "complex valid name created",
    complexNameCommunity.name,
    "C++ Programming @ 2024!",
  );
}
