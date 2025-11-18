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
 * Public SKU detail basic flow.
 *
 * This test verifies that a SKU created under a seller-owned product can be
 * retrieved from the public catalog endpoint GET
 * /shoppingMall/products/{productId}/skus/{skuId} without authentication.
 *
 * Steps:
 *
 * 1. Register a seller (join) and authenticate as that seller.
 * 2. As seller, create a product using POST /shoppingMall/seller/products.
 * 3. Register an admin (join) and authenticate as that admin.
 * 4. As admin, create a category via POST /shoppingMall/admin/categories.
 * 5. As admin, link the product and category via POST
 *    /shoppingMall/admin/products/{productId}/categories.
 * 6. As admin, create a SKU inventory state via POST
 *    /shoppingMall/admin/skuInventoryStates.
 * 7. Switch back to the seller account via POST /auth/seller/login.
 * 8. As seller, create a SKU under the product via POST
 *    /shoppingMall/seller/products/{productId}/skus, referencing the inventory
 *    state created in step 6.
 * 9. Construct an unauthenticated connection and call the public SKU detail
 *    endpoint GET /shoppingMall/products/{productId}/skus/{skuId}.
 * 10. Validate that the response is a valid IShoppingMallSku and that product.id
 *     matches the original product.id, the inventory_state.id matches the
 *     created inventory state id, and that core scalar properties (code,
 *     status, price, inventory_quantity) are preserved.
 */
export async function test_api_public_product_sku_detail_basic_flow(
  connection: api.IConnection,
) {
  // 1. Seller join (registration and initial authentication)
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoinRequest = {
    email: sellerEmail,
    password: sellerPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinRequest,
    });
  typia.assert(sellerAuthorized);

  // 2. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 3. Admin join (registration and authentication)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. Admin creates a category
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(10),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 5. Admin links product to category
  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert(productCategory);

  // 6. Admin creates a SKU inventory state
  const inventoryStateCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateCreateBody,
      },
    );
  typia.assert(inventoryState);

  // 7. Seller login to ensure seller context for SKU creation
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerReAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerReAuth);

  // 8. Seller creates a SKU under the product
  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    barcode: RandomGenerator.alphaNumeric(13),
    status: "active",
    price: 19900,
    original_price: 24900,
    inventory_quantity: 50,
    low_stock_threshold: 5,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const createdSku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert(createdSku);

  // 9. Construct an unauthenticated connection and call public SKU detail
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const publicSku: IShoppingMallSku =
    await api.functional.shoppingMall.products.skus.at(publicConnection, {
      productId: product.id,
      skuId: createdSku.id,
    });
  typia.assert(publicSku);

  // 10. Validate relationships and core fields
  TestValidator.equals(
    "SKU product id must match created product id",
    publicSku.product.id,
    product.id,
  );

  TestValidator.equals(
    "SKU inventory state id must match created inventory state id",
    publicSku.inventory_state.id,
    inventoryState.id,
  );

  TestValidator.equals("SKU code must match", publicSku.code, createdSku.code);

  TestValidator.equals(
    "SKU status must match",
    publicSku.status,
    createdSku.status,
  );

  TestValidator.equals(
    "SKU price must match",
    publicSku.price,
    createdSku.price,
  );

  TestValidator.equals(
    "SKU inventory quantity must match",
    publicSku.inventory_quantity,
    createdSku.inventory_quantity,
  );

  TestValidator.predicate(
    "SKU product summary name should be non-empty",
    publicSku.product.name.length > 0,
  );
}
