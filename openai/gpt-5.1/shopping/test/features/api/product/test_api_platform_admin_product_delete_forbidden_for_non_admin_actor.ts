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
 * Ensure that only platform administrators can delete products.
 *
 * Business goal
 *
 * - Platform admin creates catalog context (category tree, brand) and a product.
 * - We then attempt to delete that product using a connection that does not carry
 *   platformAdmin credentials, and verify that the deletion attempt fails.
 * - Finally, we confirm that the product can still be deleted by the
 *   platformAdmin, proving that unauthorized delete attempts do not remove
 *   data.
 *
 * Constraints / Available APIs
 *
 * - Auth:
 *
 *   - POST /auth/platformAdmin/join -> api.functional.auth.platformAdmin.join
 *
 *       - Body: IShoppingMallPlatformAdminJoin.IRequest
 *       - Response: IShoppingMallPlatformAdmin.IAuthorized (includes token)
 *       - Side effect: sets connection.headers.Authorization = access token.
 * - Catalog setup:
 *
 *   - POST /shoppingMall/platformAdmin/categoryTrees ->
 *       api.functional.shoppingMall.platformAdmin.categoryTrees.create
 *
 *       - Body: IShoppingMallCategoryTree.ICreate
 *       - Response: IShoppingMallCategoryTree
 *   - POST /shoppingMall/platformAdmin/brands ->
 *       api.functional.shoppingMall.platformAdmin.brands.create
 *
 *       - Body: IShoppingMallBrand.ICreate
 *       - Response: IShoppingMallBrand
 *   - POST /shoppingMall/platformAdmin/products ->
 *       api.functional.shoppingMall.platformAdmin.products.create
 *
 *       - Body: IShoppingMallProduct.ICreate
 *       - Response: IShoppingMallProduct
 * - Deletion target:
 *
 *   - DELETE /shoppingMall/platformAdmin/products/{productCode} ->
 *       api.functional.shoppingMall.platformAdmin.products.erase
 *
 *       - Props: { productCode: string }
 *       - Response: void
 *
 * Important limitations and scenario rewrite
 *
 * - We do NOT have any seller/customer auth APIs in this materials set, therefore
 *   we cannot create a true non-admin role via its own join/login.
 * - We also do NOT have any read-by-code endpoint; only create and erase are
 *   provided, so we confirm existence indirectly by successfully deleting as an
 *   admin after a failed unauthorized attempt.
 * - Tests must not touch connection.headers directly; only the SDK may do so. To
 *   simulate an unauthenticated/non-admin actor we create a cloned IConnection
 *   object with an empty headers object.
 *
 * Final scenario
 *
 * 1. Bootstrap a platform admin session with join(); connection now holds an
 *    Authorization header for a platformAdmin.
 * 2. Create a category tree (realistic admin catalog setup).
 * 3. Create a brand for the product.
 * 4. Create a product under a random seller UUID.
 * 5. Build an unauthenticated connection clone (no headers) representing a
 *    non-admin/anonymous actor.
 * 6. Call products.erase with the unauthenticated connection and verify with
 *    TestValidator.error that an error is thrown.
 * 7. Call products.erase again with the original admin-authenticated connection
 *    and expect success (no error).
 */
export async function test_api_platform_admin_product_delete_forbidden_for_non_admin_actor(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (bootstrap admin session)
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a category tree (realistic catalog context)
  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog Tree",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeCreateBody,
      },
    );
  typia.assert(categoryTree);

  // 3. Create a brand for the product
  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4. Create a product under some seller UUID. We don't have seller
  //    creation APIs here, so we use a random UUID that satisfies the DTO
  //    constraint. Backend fixtures control the actual existence.
  const randomSellerId = typia.random<string & tags.Format<"uuid">>();

  const productCreateBody = {
    shopping_mall_seller_id: randomSellerId,
    shopping_mall_brand_id: brand.id,
    code: `prod-${RandomGenerator.alphaNumeric(10)}`,
    name: `Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/product-primary.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert(product);

  // 5. Capture product code; we'll try to delete using a non-admin connection
  const productCode: string = product.code;

  // 6. Build an unauthenticated connection clone representing a non-admin or
  //    anonymous actor. We must not touch connection.headers on the original
  //    object; creating a new IConnection value is allowed.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 7. Attempt to delete the product using the unauthenticated connection and
  //    assert that an error is thrown.
  await TestValidator.error("non-admin delete attempt must fail", async () => {
    await api.functional.shoppingMall.platformAdmin.products.erase(
      unauthenticatedConnection,
      {
        productCode,
      },
    );
  });

  // 8. Use the original admin-authenticated connection to delete the product
  //    successfully. If this throws, the test should fail.
  await api.functional.shoppingMall.platformAdmin.products.erase(connection, {
    productCode,
  });
}
