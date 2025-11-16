import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate public (guest) retrieval of a specific category by tree code and
 * category code.
 *
 * Business context:
 *
 * - Platform administrators configure catalog trees and categories through
 *   protected admin APIs.
 * - Guests (unauthenticated clients) should be able to read category structures
 *   publicly without any Authorization header to build navigation, landing
 *   pages, SEO, etc.
 *
 * Scenario steps:
 *
 * 1. Register a platform admin using /auth/platformAdmin/join to obtain an
 *    authenticated admin session on the provided connection.
 * 2. As this admin, create a category tree using POST
 *    /shoppingMall/platformAdmin/categoryTrees with a stable business code.
 * 3. Under that tree, create a single active category using POST
 *    /shoppingMall/platformAdmin/categoryTrees/{categoryTreeCode}/categories.
 * 4. Derive a guest connection (no Authorization header) from the original
 *    connection.
 * 5. As a guest, call GET
 *    /shoppingMall/categoryTrees/{categoryTreeCode}/categories/{categoryCode}
 *    and verify that the category is returned and matches what was created.
 * 6. Assert that key business fields (treeCode, code, name, isActive, deletedAt)
 *    are correct, delegating strict structural validation to typia.assert.
 * 7. Re-invoke the same GET as guest to confirm the endpoint remains publicly
 *    accessible and stable, and compare core fields between the two responses.
 */
export async function test_api_category_retrieval_public_access(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (join) to bootstrap an authenticated admin session
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "Admin1234!",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a category tree as the authenticated platform admin
  const treeCode: string = RandomGenerator.alphaNumeric(10);
  const treeCreateBody = {
    code: treeCode,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const tree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: treeCreateBody,
      },
    );
  typia.assert(tree);

  TestValidator.equals(
    "created tree code should match requested code",
    tree.code,
    treeCode,
  );

  // 3. Create an active category in that tree
  const categoryCode: string = RandomGenerator.alphaNumeric(12);
  const categoryName: string = RandomGenerator.name();

  const categoryCreateBody = {
    code: categoryCode,
    name: categoryName,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    // Let server accept a simple small int32-compatible display order
    displayOrder: 1,
    isActive: true,
    // Root category: no parentCategoryCode
  } satisfies IShoppingMallCategory.ICreate;

  const createdCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: categoryCreateBody,
      },
    );
  typia.assert(createdCategory);

  TestValidator.equals(
    "created category treeCode matches tree.code",
    createdCategory.treeCode,
    tree.code,
  );
  TestValidator.equals(
    "created category code matches requested code",
    createdCategory.code,
    categoryCode,
  );
  TestValidator.equals(
    "created category name matches requested name",
    createdCategory.name,
    categoryName,
  );
  TestValidator.predicate(
    "created category should be active",
    createdCategory.isActive === true,
  );
  TestValidator.equals(
    "created category deletedAt should be null or undefined",
    createdCategory.deletedAt ?? null,
    null,
  );

  // 4. Derive a guest (unauthenticated) connection without mutating original headers
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Guest retrieves the category by tree code and category code
  const guestCategoryOnce: IShoppingMallCategory =
    await api.functional.shoppingMall.categoryTrees.categories.at(
      guestConnection,
      {
        categoryTreeCode: tree.code,
        categoryCode: createdCategory.code,
      },
    );
  typia.assert(guestCategoryOnce);

  // 6. Validate business expectations on the guest-visible category
  TestValidator.equals(
    "guest category id should match created category id",
    guestCategoryOnce.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "guest category treeCode should match created tree code",
    guestCategoryOnce.treeCode,
    tree.code,
  );
  TestValidator.equals(
    "guest category code should match created category code",
    guestCategoryOnce.code,
    categoryCode,
  );
  TestValidator.equals(
    "guest category name should match created category name",
    guestCategoryOnce.name,
    categoryName,
  );
  TestValidator.predicate(
    "guest category should be active",
    guestCategoryOnce.isActive === true,
  );
  TestValidator.equals(
    "guest category deletedAt should remain null or undefined",
    guestCategoryOnce.deletedAt ?? null,
    null,
  );

  // 7. Re-invoke GET without authentication to confirm public accessibility and stability
  const guestCategoryTwice: IShoppingMallCategory =
    await api.functional.shoppingMall.categoryTrees.categories.at(
      guestConnection,
      {
        categoryTreeCode: tree.code,
        categoryCode: createdCategory.code,
      },
    );
  typia.assert(guestCategoryTwice);

  TestValidator.equals(
    "subsequent guest retrieval should return same id",
    guestCategoryTwice.id,
    guestCategoryOnce.id,
  );
  TestValidator.equals(
    "subsequent guest retrieval should return same treeCode",
    guestCategoryTwice.treeCode,
    guestCategoryOnce.treeCode,
  );
  TestValidator.equals(
    "subsequent guest retrieval should return same category code",
    guestCategoryTwice.code,
    guestCategoryOnce.code,
  );
  TestValidator.equals(
    "subsequent guest retrieval should preserve isActive",
    guestCategoryTwice.isActive,
    guestCategoryOnce.isActive,
  );
  TestValidator.equals(
    "subsequent guest retrieval should preserve deletedAt",
    guestCategoryTwice.deletedAt ?? null,
    guestCategoryOnce.deletedAt ?? null,
  );
}
