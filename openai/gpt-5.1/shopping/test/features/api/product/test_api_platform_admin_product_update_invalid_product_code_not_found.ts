import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that updating a non-existent product by productCode fails with a
 * not-found style error for platform admins.
 *
 * Business context: Platform administrators manage catalog products via
 * business-visible codes. The PUT
 * /shoppingMall/platformAdmin/products/{productCode} endpoint is intended
 * strictly for updating existing products. When a platform admin attempts to
 * update a product using a code that does not map to any row in
 * shopping_mall_products, the system must return a not-found style error and
 * must not create a new product implicitly.
 *
 * Test steps:
 *
 * 1. Register a platform administrator via POST /auth/platformAdmin/join using a
 *    valid IShoppingMallPlatformAdminJoin.IRequest payload. The SDK will
 *    automatically store the Authorization access token on the connection
 *    object, enabling authenticated admin calls.
 * 2. To mirror a realistic environment, create a category tree using POST
 *    /shoppingMall/platformAdmin/categoryTrees with
 *    IShoppingMallCategoryTree.ICreate, and a brand using POST
 *    /shoppingMall/platformAdmin/brands with IShoppingMallBrand.ICreate. These
 *    calls prove that the admin is properly authenticated and that
 *    catalog-related admin endpoints work, but they are not tied to the target
 *    productCode under test.
 * 3. Generate a synthetic productCode that is virtually guaranteed not to exist.
 *    For example, combine a UUID-like random value with a fixed prefix such as
 *    "non-existent-" using typia.random<string & tags.Format<"uuid">>() or
 *    RandomGenerator.alphaNumeric(). Do not call any product creation endpoint
 *    with this code so that the backend should treat it as unknown.
 * 4. Construct a minimal, valid IShoppingMallProduct.IUpdate payload, such as
 *    changing only the `name` field or including a couple of mutable fields
 *    (e.g., `description`, `status`, or `isMultiSku`). Ensure that only fields
 *    defined in IShoppingMallProduct.IUpdate are used and that we do not try to
 *    send immutable fields like `id` or `code`.
 * 5. Invoke api.functional.shoppingMall.platformAdmin.products.update with the
 *    chosen non-existent productCode and the IUpdate payload inside
 *    TestValidator.error. The expectation is that the call throws a not-found
 *    style error (e.g., an HttpError internally) rather than succeeding.
 * 6. Do not assert specific HTTP status codes or error payload shapes; simply
 *    assert that an error is thrown using TestValidator.error. This conforms to
 *    the global testing rules that forbid explicit status code checks.
 * 7. Because the available SDK does not expose any get/list endpoint for products,
 *    do not attempt to verify that the product was not created. The absence of
 *    such endpoints means this test can only assert that the update fails when
 *    the productCode is unknown, implicitly relying on the backend contract
 *    that update never creates resources.
 */
export async function test_api_platform_admin_product_update_invalid_product_code_not_found(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (join) to obtain an authorized session.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(16),
    ip: RandomGenerator.alphaNumeric(10),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/marketing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a category tree to simulate realistic catalog configuration.
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(12)}`,
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert<IShoppingMallCategoryTree>(categoryTree);

  // 3. Create a brand to further mimic a realistic catalog context.
  const brandBody = {
    name: RandomGenerator.name(2),
    slug: `brand-${RandomGenerator.alphaNumeric(10)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand = await api.functional.shoppingMall.platformAdmin.brands.create(
    connection,
    {
      body: brandBody,
    },
  );
  typia.assert<IShoppingMallBrand>(brand);

  // 4. Generate a synthetic, non-existent productCode.
  const nonExistentProductCode: string = `non-existent-${typia.random<
    string & tags.Format<"uuid">
  >()}`;

  // 5. Prepare a minimal but valid product update body.
  const updateBody = {
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IShoppingMallProduct.IUpdate;

  // 6. Attempt to update the non-existent product and assert that it fails.
  await TestValidator.error(
    "updating non-existent productCode must result in error",
    async () => {
      await api.functional.shoppingMall.platformAdmin.products.update(
        connection,
        {
          productCode: nonExistentProductCode,
          body: updateBody,
        },
      );
    },
  );
}
