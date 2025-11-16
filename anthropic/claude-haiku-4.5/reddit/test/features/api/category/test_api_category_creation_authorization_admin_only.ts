import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test authorization enforcement for category creation endpoint.
 *
 * Validates that only administrators can create categories through the POST
 * /communityPlatform/administrator/categories endpoint. Regular members and
 * unauthenticated requests should be rejected.
 *
 * Test process:
 *
 * 1. Create and authenticate administrator account
 * 2. Admin creates a category successfully
 * 3. Create and authenticate regular member account
 * 4. Member attempts to create category - should receive 403 Forbidden
 * 5. Verify authorization checks properly enforce admin-only access
 */
export async function test_api_category_creation_authorization_admin_only(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Admin creates category successfully
  const categoryData = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    slug: RandomGenerator.alphabets(8),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
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
    "admin category creation succeeds",
    createdCategory.name,
    categoryData.name,
  );

  // Step 3: Create regular member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8),
      password: RandomGenerator.alphabets(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Member attempts to create category - should fail with 403
  const memberCategoryData = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    slug: RandomGenerator.alphabets(8),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
  } satisfies ICommunityPlatformCategory.ICreate;

  await TestValidator.error(
    "regular member cannot create category",
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: memberCategoryData,
        },
      );
    },
  );

  // Step 5: Verify admin can still create categories
  const anotherCategoryData = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    slug: RandomGenerator.alphabets(8),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
  } satisfies ICommunityPlatformCategory.ICreate;

  // Switch back to admin by making a new admin join (which sets auth headers)
  const anotherAdmin = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(anotherAdmin);

  const anotherCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: anotherCategoryData,
      },
    );
  typia.assert(anotherCategory);
  TestValidator.equals(
    "admin can still create category",
    anotherCategory.name,
    anotherCategoryData.name,
  );
}
