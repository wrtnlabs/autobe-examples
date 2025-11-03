import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityCategory";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

export async function test_api_category_retrieval_by_code(
  connection: api.IConnection,
) {
  /**
   * Validate public retrieval of a community category by its canonical code.
   *
   * Steps:
   *
   * 1. Register a system administrator (POST /auth/systemAdmin/join)
   * 2. Create a new category as admin (POST /communityBbs/systemAdmin/categories)
   * 3. Using an unauthenticated connection, GET /communityBbs/categories/{code}
   *    and assert returned fields match the created record
   * 4. Verify GET for a clearly non-existent code results in an error
   *
   * Notes:
   *
   * - The SDK material does not provide a DELETE admin endpoint for categories,
   *   therefore the soft-delete edge-case (soft-deleting then GET -> 404) is
   *   intentionally omitted.
   */

  // 1) Create system administrator and obtain authorization (SDK sets headers)
  const adminEmail: string = `${RandomGenerator.alphaNumeric(6)}@example.test`;
  const adminPassword = "Passw0rd!";

  const adminAuth: ICommunityBbsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
      } satisfies ICommunityBbsSystemAdmin.ICreate,
    });
  typia.assert(adminAuth);

  // 2) Create a unique category as admin
  const uniqueSuffix = `${Date.now()}-${RandomGenerator.alphaNumeric(4)}`;
  const categoryCode = `test-cat-${uniqueSuffix}`;
  const categoryTitle = RandomGenerator.paragraph({ sentences: 3 });
  const categoryDescription = RandomGenerator.paragraph({ sentences: 8 });
  const displayOrder = 0;

  const created: ICommunityBbsCommunityCategory =
    await api.functional.communityBbs.systemAdmin.categories.create(
      connection,
      {
        body: {
          code: categoryCode,
          title: categoryTitle,
          description: categoryDescription,
          display_order: displayOrder,
        } satisfies ICommunityBbsCommunityCategory.ICreate,
      },
    );
  typia.assert(created);

  // Basic sanity checks on the created category returned to admin
  TestValidator.predicate(
    "created category has id",
    typeof created.id === "string" && created.id.length > 0,
  );
  TestValidator.equals(
    "created category code matches request",
    created.code,
    categoryCode,
  );
  TestValidator.equals(
    "created category title matches request",
    created.title,
    categoryTitle,
  );
  TestValidator.equals(
    "created category description matches request",
    created.description,
    categoryDescription,
  );
  TestValidator.equals(
    "created category display_order matches request",
    created.display_order,
    displayOrder,
  );

  // 3) Use an unauthenticated connection to call public GET
  const publicConn: api.IConnection = { ...connection, headers: {} };

  const publicCategory: ICommunityBbsCommunityCategory =
    await api.functional.communityBbs.categories.at(publicConn, {
      categoryCode,
    });
  typia.assert(publicCategory);

  // Verify public response fields match the created category
  TestValidator.equals(
    "public category id matches created id",
    publicCategory.id,
    created.id,
  );
  TestValidator.equals(
    "public category code matches",
    publicCategory.code,
    created.code,
  );
  TestValidator.equals(
    "public category title matches",
    publicCategory.title,
    created.title,
  );
  TestValidator.equals(
    "public category description matches",
    publicCategory.description,
    created.description,
  );
  TestValidator.equals(
    "public category display_order matches",
    publicCategory.display_order,
    created.display_order,
  );

  // parent should be null/undefined for top-level category
  TestValidator.predicate(
    "public category parent is null or undefined",
    publicCategory.parent === null || publicCategory.parent === undefined,
  );

  // 4) Non-existent category -> expect error
  const nonExistentCode = `no-such-category-${Date.now()}-${RandomGenerator.alphaNumeric(3)}`;
  await TestValidator.error(
    "GET non-existent category should fail",
    async () => {
      await api.functional.communityBbs.categories.at(publicConn, {
        categoryCode: nonExistentCode,
      });
    },
  );
}
