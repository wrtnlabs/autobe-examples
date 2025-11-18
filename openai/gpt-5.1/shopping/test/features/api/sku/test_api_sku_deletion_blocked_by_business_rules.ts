import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Validate that SKU deletion is blocked by higher-level business rules for an
 * owning seller.
 *
 * Business goal: Ensure that even when a seller owns the product and its SKU,
 * calling the SKU delete endpoint does not succeed when upstream policies
 * decide the SKU cannot be hard-deleted (for example due to order or
 * fulfillment history). The API must surface a failure through an HttpError
 * instead of silently succeeding.
 *
 * Scope and constraints:
 *
 * - We have full CRUD setup endpoints for auth (seller/admin), category, product,
 *   product-category link, SKU inventory state, and SKU creation.
 * - We do NOT have an API to re-read or search SKUs after deletion, so we cannot
 *   assert persistence state directly; we only assert that the delete call
 *   fails.
 * - We are not allowed to intentionally send wrong-typed or structurally invalid
 *   DTOs; all request bodies must conform to their DTO schemas.
 * - We must not manually touch connection.headers other than letting SDK flows
 *   manage them.
 *
 * High-level workflow:
 *
 * 1. Create a seller via POST /auth/seller/join (seller join) and keep seller
 *    email/password.
 *
 *    - SDK automatically sets Authorization header with seller token.
 * 2. As an admin, create an admin account via POST /auth/admin/join; SDK switches
 *    Authorization to admin tokens.
 * 3. Using admin context, create a SKU inventory state via POST
 *    /shoppingMall/admin/skuInventoryStates (e.g., code "in_stock",
 *    is_purchasable true).
 * 4. Still as admin, create a category via POST /shoppingMall/admin/categories.
 * 5. Switch back to seller context with POST /auth/seller/login using the same
 *    seller credentials to ensure seller Authorization header is active.
 * 6. As seller, create a product via POST /shoppingMall/seller/products and
 *    capture productId.
 * 7. Switch to admin again with POST /auth/admin/login; associate the product with
 *    the category using POST
 *    /shoppingMall/admin/products/{productId}/categories.
 * 8. Switch back to seller via POST /auth/seller/login.
 * 9. As seller, create a SKU for the product via POST
 *    /shoppingMall/seller/products/{productId}/skus using the previously
 *    created skuInventoryStateId and realistic pricing/inventory values;
 *    capture skuId.
 * 10. Attempt to delete the SKU by calling DELETE
 *     /shoppingMall/seller/products/{productId}/skus/{skuId}.
 * 11. Use TestValidator.error with an async callback around the erase call to
 *     assert that a business-rule error (HttpError) is thrown instead of
 *     successful completion.
 *
 * Important assertions:
 *
 * - All intermediate creations (seller, admin, inventory state, category,
 *   product, product-category link, SKU) return valid DTOs (validated with
 *   typia.assert).
 * - The final erase call does not complete successfully but instead triggers an
 *   error captured by TestValidator.error, proving that deletion is blocked at
 *   the API level.
 */
export async function test_api_sku_deletion_blocked_by_business_rules(
  connection: api.IConnection,
) {
  // Helper to generate common href/referrer URIs
  const href: string = "https://frontend.shoppingmall.test/join";
  const referrer: string = "https://frontend.shoppingmall.test/landing";

  // 1. Seller joins (registration + initial token)
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoinRequest = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinRequest,
    });
  typia.assert(sellerAuthorized);

  // 2. Admin joins (admin registration + initial token)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinRequest = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(adminAuthorized);

  // 3. As admin, create a SKU inventory state configuration
  const inventoryStateCreate = {
    code: `in_stock_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateCreate,
      },
    );
  typia.assert(inventoryState);

  // 4. As admin, create a category
  const categoryCreate = {
    parent_id: null,
    slug: `category-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreate,
    });
  typia.assert(category);

  // 5. Switch back to seller context with explicit login
  const sellerLoginRequest = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginRequest,
    });
  typia.assert(sellerLoginAuthorized);

  // 6. As seller, create a product
  const productCreate = {
    code: `PROD-${RandomGenerator.alphaNumeric(10)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.name(1),
    status: "active",
    primary_image_uri:
      "https://cdn.shoppingmall.test/images/" +
      RandomGenerator.alphaNumeric(12),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreate,
    });
  typia.assert(product);

  // 7. Switch to admin to associate product with category
  const adminLoginRequest = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginRequest,
    });
  typia.assert(adminLoginAuthorized);

  const productCategoryCreate = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreate,
      },
    );
  typia.assert(productCategory);

  // 8. Switch back to seller context again before SKU creation
  const sellerLoginAuthorizedAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginRequest,
    });
  typia.assert(sellerLoginAuthorizedAgain);

  // 9. As seller, create a SKU under the product using the inventory state
  const skuCreate = {
    code: `SKU-${RandomGenerator.alphaNumeric(10)}`,
    barcode: RandomGenerator.alphaNumeric(12),
    status: "active",
    price: 19990,
    original_price: 24990,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [
      {
        system_code: "ERP",
        external_id: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSkuExternalId.ICreate,
    ],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreate,
    });
  typia.assert(sku);

  // 10. Attempt to delete the SKU and expect business-rule failure
  await TestValidator.error(
    "seller SKU deletion is blocked by business rules",
    async () => {
      await api.functional.shoppingMall.seller.products.skus.erase(connection, {
        productId: product.id,
        skuId: sku.id,
      });
    },
  );
}
