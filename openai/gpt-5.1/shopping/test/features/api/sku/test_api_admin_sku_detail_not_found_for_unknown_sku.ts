import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Validate that admin SKU detail endpoint returns an error for unknown SKU IDs.
 *
 * Business context: Admins can fetch detailed information about a specific SKU
 * via GET /shoppingMall/admin/skus/{skuId}. When the provided skuId does not
 * correspond to any existing SKU record, the endpoint must fail with a
 * not-found style error instead of returning arbitrary or unrelated data. This
 * test ensures that behavior, even when the catalog already contains valid
 * products and SKUs.
 *
 * Test steps:
 *
 * 1. Create an administrator account via /auth/admin/join so we can call
 *    admin-only endpoints. Admin join auto-authenticates and seeds the
 *    Authorization header with an admin JWT.
 * 2. Create a seller account via /auth/seller/join and authenticate via
 *    /auth/seller/login to get a seller context for seller product/SKU APIs.
 * 3. As seller, create a product with POST /shoppingMall/seller/products using
 *    IShoppingMallProduct.ICreate.
 * 4. Switch to admin context (login with the admin credentials) and create a SKU
 *    inventory state via POST /shoppingMall/admin/skuInventoryStates using
 *    IShoppingMallSkuInventoryState.ICreate so that SKUs can reference a valid
 *    inventory state.
 * 5. Switch back to seller context and create a real SKU for the product via POST
 *    /shoppingMall/seller/products/{productId}/skus using
 *    IShoppingMallSku.ICreate, referencing the created inventory state. This
 *    ensures shopping_mall_skus is non-empty.
 * 6. Generate a random UUID different from the created SKU id; this will be used
 *    as the unknown skuId.
 * 7. Switch to admin context again and call GET /shoppingMall/admin/skus/{skuId}
 *    with the unknown skuId.
 * 8. Assert that the call fails by using TestValidator.error() with an async
 *    closure wrapping the admin SKU detail call. We do not check specific HTTP
 *    status codes or response body contents; we only assert that an error is
 *    thrown and no SKU data is returned.
 */
export async function test_api_admin_sku_detail_not_found_for_unknown_sku(
  connection: api.IConnection,
) {
  // 1. Create admin via join (auto-authenticated as admin)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinBody = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create seller via join
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerJoinBody = {
    email: sellerEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.test.local/join",
    referrer: "https://seller.test.local/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 3. As seller, create a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 4. Switch to admin context via login (refresh Authorization header)
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.test.local/login",
    referrer: "https://admin.test.local/join-complete",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 5. Create an inventory state as admin
  const inventoryStateBody = {
    code: `state_${RandomGenerator.alphabets(6)}`,
    name: "In Stock",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateBody,
      },
    );
  typia.assert(inventoryState);

  // 6. Switch back to seller context via login to create a real SKU
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.test.local/login",
    referrer: "https://seller.test.local/join-complete",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    barcode: null,
    status: "active",
    price: 1000,
    original_price: null,
    inventory_quantity: 10,
    low_stock_threshold: null,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const existingSku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert(existingSku);

  // 7. Generate an unknown SKU UUID that differs from the existing one
  let unknownSkuId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (unknownSkuId === existingSku.id) {
    unknownSkuId = typia.random<string & tags.Format<"uuid">>();
  }

  // 8. Switch to admin context again
  const adminLoggedInAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedInAgain);

  // 9. As admin, calling SKU detail with an unknown ID must result in error
  await TestValidator.error(
    "admin sku detail should error for unknown skuId",
    async () => {
      await api.functional.shoppingMall.admin.skus.at(connection, {
        skuId: unknownSkuId,
      });
    },
  );
}
