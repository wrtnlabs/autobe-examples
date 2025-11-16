import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that deleting a non-existing product by code returns a not-found
 * HTTP error for a platform admin.
 *
 * Business context: Platform administrators manage catalog products via
 * business-facing codes. When they attempt to delete a product using a
 * productCode that does not exist in shopping_mall_products, the system must
 * respond with a 404-style domain error instead of silently succeeding or
 * creating/modifying data.
 *
 * Test steps:
 *
 * 1. Bootstrap a platform admin session using POST /auth/platformAdmin/join, which
 *    returns IShoppingMallPlatformAdmin.IAuthorized and sets the Authorization
 *    header on the shared connection.
 * 2. Optionally create surrounding catalog context to simulate a realistic
 *    environment:
 *
 *    - Create one brand via POST /shoppingMall/platformAdmin/brands using
 *         IShoppingMallBrand.ICreate.
 *    - Create one category tree via POST /shoppingMall/platformAdmin/categoryTrees
 *         using IShoppingMallCategoryTree.ICreate. These operations must NOT
 *         create any products, and nothing uses the specific test productCode.
 * 3. Generate a productCode that is extremely unlikely to exist using
 *    RandomGenerator.alphaNumeric and prefixing it with a distinctive marker so
 *    collisions are practically impossible.
 * 4. Invoke api.functional.shoppingMall.platformAdmin.products.erase(connection, {
 *    productCode }) with this code.
 * 5. Use TestValidator.httpError to assert that the call fails with a 404-style
 *    status code. Because we cannot depend on any particular error body schema,
 *    we validate only the HTTP status code, not the response payload.
 * 6. Since erase returns void on success and the call is expected to fail, there
 *    is no need for post-condition product existence checks; the essential
 *    guarantee is the not-found HTTP error.
 */
export async function test_api_platform_admin_product_delete_not_found_for_unknown_code(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and establish Authorization context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: `https://admin.example.com/${RandomGenerator.alphaNumeric(8)}`,
    referrer: `https://landing.example.com/${RandomGenerator.alphaNumeric(8)}`,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create optional catalog context: one brand and one category tree
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: `https://cdn.example.com/logo/${RandomGenerator.alphaNumeric(12)}.png`,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert<IShoppingMallBrand>(brand);

  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(10)}`,
    name: `Category Tree ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeBody,
      },
    );
  typia.assert<IShoppingMallCategoryTree>(categoryTree);

  // 3. Choose a productCode that is guaranteed not to exist by using a unique
  //    random marker prefix that no test creates products for
  const unknownProductCode: string = `nonexistent-${RandomGenerator.alphaNumeric(24)}`;

  // 4. Attempt to delete the non-existing product and assert a 404-style error
  await TestValidator.httpError(
    "deleting non-existing product by code should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.platformAdmin.products.erase(
        connection,
        {
          productCode: unknownProductCode,
        },
      );
    },
  );
}
