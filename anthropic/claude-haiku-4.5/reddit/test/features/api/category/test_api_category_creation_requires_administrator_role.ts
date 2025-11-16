import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that category creation requires administrator authentication and
 * authorization.
 *
 * This test validates the role-based access control (RBAC) enforcement for
 * category creation. The endpoint should only allow authenticated
 * administrators to create new categories. Unauthenticated requests must be
 * rejected with an unauthorized error, demonstrating that proper authentication
 * and authorization checks are in place at the API level.
 *
 * Test workflow:
 *
 * 1. Attempt category creation without authentication - should fail with
 *    unauthorized error
 * 2. Create administrator account via authentication endpoint
 * 3. Use authenticated connection to successfully create a category
 * 4. Validate response contains proper category data with all expected fields
 */
export async function test_api_category_creation_requires_administrator_role(
  connection: api.IConnection,
) {
  // Step 1: Attempt to create category without authentication
  // This should fail because the endpoint requires administrator role
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated category creation should fail",
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        unauthConn,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 1 }),
            slug: RandomGenerator.alphabets(10),
            display_order: 0,
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );

  // Step 2: Authenticate as administrator
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminAuth: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(10),
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(adminAuth);

  // Step 3: Create category with authenticated administrator connection
  const categoryData = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    slug: RandomGenerator.alphabets(15),
    display_order: 1,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCategory.ICreate;

  const createdCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(createdCategory);

  // Step 4: Validate response structure and data
  TestValidator.equals(
    "created category name matches input",
    createdCategory.name,
    categoryData.name,
  );
  TestValidator.equals(
    "created category slug matches input",
    createdCategory.slug,
    categoryData.slug,
  );
  TestValidator.equals(
    "created category display_order matches input",
    createdCategory.display_order,
    categoryData.display_order,
  );
  TestValidator.predicate(
    "category id is valid uuid",
    typia.is<string & tags.Format<"uuid">>(createdCategory.id),
  );
  TestValidator.predicate(
    "category is marked as active",
    createdCategory.is_active === true,
  );
  TestValidator.predicate(
    "created_at timestamp is set",
    createdCategory.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at timestamp is set",
    createdCategory.updated_at !== null,
  );
}
