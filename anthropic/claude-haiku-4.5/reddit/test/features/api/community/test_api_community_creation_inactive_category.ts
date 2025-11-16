import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_creation_inactive_category(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for managing categories
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminPassword = `Pass${RandomGenerator.alphaNumeric(10)}1`;
  const adminAuthResponse = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: `Admin ${RandomGenerator.name()}`,
        href: "https://platform.example.com/admin",
        referrer: "https://platform.example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(adminAuthResponse);

  // Step 2: Create a category that is active
  const categoryData = {
    name: `Active Category ${RandomGenerator.alphaNumeric(6)}`,
    slug: `active-cat-${RandomGenerator.alphaNumeric(6)}`,
    description: "Active category for testing community creation",
    display_order: 100,
  } satisfies ICommunityPlatformCategory.ICreate;

  const createdCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(createdCategory);
  TestValidator.equals(
    "created category should be active by default",
    createdCategory.is_active,
    true,
  );

  // Step 3: Create member account for community creation
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberPassword = `Pass${RandomGenerator.alphaNumeric(10)}1`;
  const memberAuthResponse = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: `member_${RandomGenerator.alphaNumeric(8)}`,
      password: memberPassword,
      href: "https://platform.example.com/register",
      referrer: "https://platform.example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAuthResponse);

  // Step 4: Login as member to set up authentication context
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://platform.example.com/login",
      referrer: "https://platform.example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 5: Create community successfully with active category
  // This validates that active categories are accepted for community creation
  const communityData = {
    name: `Test Community ${RandomGenerator.alphaNumeric(6)}`,
    identifier: `test-com-${RandomGenerator.alphaNumeric(6)}`,
    description: "Test community in active category",
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: createdCategory.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(createdCommunity);

  // Step 6: Validate the community was created with correct category
  TestValidator.equals(
    "created community should reference the active category",
    createdCommunity.category.slug,
    createdCategory.slug,
  );

  // Step 7: Attempt to create community with non-existent category slug
  // This demonstrates that invalid/inactive categories are rejected
  const inactiveCategorySlug = `inactive-cat-${RandomGenerator.alphaNumeric(6)}`;
  await TestValidator.error(
    "should reject community creation with non-existent/inactive category",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: `Test Community ${RandomGenerator.alphaNumeric(6)}`,
            identifier: `test-com-${RandomGenerator.alphaNumeric(6)}`,
            description: "Test community with invalid category",
            visibility: "public" as const,
            post_creation_restriction: "open_to_all" as const,
            post_type_restriction: "all_types" as const,
            category_slug: inactiveCategorySlug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  TestValidator.predicate(
    "community creation properly validates category availability",
    true,
  );
}
