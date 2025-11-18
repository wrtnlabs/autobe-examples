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

export async function test_api_sku_update_basic_fields_by_owner_seller(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.test.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.test.com/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorizedFromJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. Admin login (ensure admin token is active and context is correct)
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.test.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.test.com/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorized);

  // 3. Admin creates SKU inventory state
  const inventoryStateBody = {
    code: `state_${RandomGenerator.alphabets(6)}`,
    name: "In Stock",
    description: "Standard in-stock state for SKUs",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: inventoryStateBody },
    );
  typia.assert(inventoryState);

  // 4. Admin creates a category
  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphabets(8)}`,
    name_en: "Root Category",
    description_en: "Root category for SKU update test",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 5. Seller join (self registration)
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.test.com` as string &
      tags.Format<"email">,
    password: "SellerPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.test.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.test.com/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorizedFromJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorizedFromJoin);

  // 6. Seller creates a product
  const productBody = {
    code: `prod-${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://images.test.com/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 7. Admin login again (ensure admin context) and link category to product
  const adminAuthorizedForCategory: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedForCategory);

  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryBody,
      },
    );
  typia.assert(productCategory);

  // 8. Seller login to ensure seller context is active before SKU operations
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.test.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.test.com/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAuthorized);

  // 9. Seller creates an initial SKU for this product
  const initialPrice: number & tags.Minimum<0> = 100;
  const initialOriginalPrice: number & tags.Minimum<0> = 120;
  const initialInventoryQuantity: number &
    tags.Type<"int32"> &
    tags.Minimum<0> = 10 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const initialLowStockThreshold: number &
    tags.Type<"int32"> &
    tags.Minimum<0> = 2 as number & tags.Type<"int32"> & tags.Minimum<0>;

  const skuCreateBody = {
    code: `sku-${RandomGenerator.alphabets(8)}`,
    barcode: `BC-${RandomGenerator.alphaNumeric(10)}`,
    status: "active",
    price: initialPrice,
    original_price: initialOriginalPrice,
    inventory_quantity: initialInventoryQuantity,
    low_stock_threshold: initialLowStockThreshold,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const originalSku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert(originalSku);

  // 10. Prepare update payload changing core mutable fields
  const updatedPrice: number & tags.Minimum<0> = 150;
  const updatedOriginalPrice: number & tags.Minimum<0> = 180;
  const updatedInventoryQuantity: number &
    tags.Type<"int32"> &
    tags.Minimum<0> = 25 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const updatedLowStockThreshold: number &
    tags.Type<"int32"> &
    tags.Minimum<0> = 5 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const updatedStatus: string & tags.MinLength<1> & tags.MaxLength<64> =
    "inactive" as string & tags.MinLength<1> & tags.MaxLength<64>;

  const skuUpdateBody = {
    status: updatedStatus,
    price: updatedPrice,
    original_price: updatedOriginalPrice,
    inventory_quantity: updatedInventoryQuantity,
    low_stock_threshold: updatedLowStockThreshold,
    // keep same inventory state to validate that relation is stable
    shopping_mall_sku_inventory_state_id: originalSku.inventory_state
      .id as string & tags.Format<"uuid">,
  } satisfies IShoppingMallSku.IUpdate;

  const updatedSku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.update(connection, {
      productId: originalSku.product.id as string & tags.Format<"uuid">,
      skuId: originalSku.id as string & tags.Format<"uuid">,
      body: skuUpdateBody,
    });
  typia.assert(updatedSku);

  // 11. Validate immutable identity aspects
  TestValidator.equals(
    "SKU id should remain unchanged after update",
    updatedSku.id,
    originalSku.id,
  );

  TestValidator.equals(
    "SKU's product id should remain unchanged",
    updatedSku.product.id,
    originalSku.product.id,
  );

  TestValidator.equals(
    "SKU's inventory state id should remain unchanged when not changed in update",
    updatedSku.inventory_state.id,
    originalSku.inventory_state.id,
  );

  // 12. Validate updated mutable fields
  TestValidator.equals(
    "SKU status should be updated to new value",
    updatedSku.status,
    updatedStatus,
  );

  TestValidator.equals(
    "SKU price should be updated to new value",
    updatedSku.price,
    updatedPrice,
  );

  TestValidator.equals(
    "SKU original_price should be updated to new value",
    updatedSku.original_price,
    updatedOriginalPrice,
  );

  TestValidator.equals(
    "SKU inventory_quantity should be updated to new stock",
    updatedSku.inventory_quantity,
    updatedInventoryQuantity,
  );

  TestValidator.equals(
    "SKU low_stock_threshold should be updated to new threshold",
    updatedSku.low_stock_threshold,
    updatedLowStockThreshold,
  );

  // 13. created_at must stay the same; updated_at should change
  TestValidator.equals(
    "SKU created_at should remain unchanged after update",
    updatedSku.created_at,
    originalSku.created_at,
  );

  TestValidator.notEquals(
    "SKU updated_at should change after update",
    updatedSku.updated_at,
    originalSku.updated_at,
  );
}
