import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSku";
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
 * Validate admin SKU search combined filtering by inventory state and status
 * list.
 *
 * Business flow:
 *
 * 1. Register an admin and rely on the SDK to attach an admin token.
 * 2. As admin, create two SKU inventory states: `in_stock` and `preorder`.
 * 3. Register a seller and log in as that seller.
 * 4. Seller creates a product.
 * 5. Switch back to admin, create a category and associate the product with it.
 * 6. Switch again to seller and create three SKUs under the product:
 *
 *    - SKU A: inventory_state = in_stock, status = active.
 *    - SKU B: inventory_state = in_stock, status = draft.
 *    - SKU C: inventory_state = preorder, status = active.
 * 7. Switch to admin and call PATCH /shoppingMall/admin/skus with:
 *
 *    - ProductId = product.id
 *    - InventoryStateCode = "in_stock"
 *    - StatusList = ["active", "inactive"].
 * 8. Assert that only SKU A is returned and pagination metadata matches the
 *    request.
 */
export async function test_api_admin_sku_search_inventory_state_and_status_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join (creates admin and sets token)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // 2. As admin, create inventory states: in_stock and preorder
  const inStockState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: {
          code: "in_stock",
          name: "In Stock",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_purchasable: true,
        } satisfies IShoppingMallSkuInventoryState.ICreate,
      },
    );
  typia.assert(inStockState);

  const preorderState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: {
          code: "preorder",
          name: "Pre-order",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_purchasable: true,
        } satisfies IShoppingMallSkuInventoryState.ICreate,
      },
    );
  typia.assert(preorderState);

  // 3. Register seller
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoin);

  // 4. Seller login (switch actor to seller)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 5. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.name(1),
    status: "active",
    primary_image_uri: "https://cdn.example.com/image.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 6. Explicit admin login to switch back to admin actor
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 7. Admin creates a category
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(10),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 8. Associate product with category
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

  // 9. Switch back to seller to create SKUs
  const sellerLogin2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin2);

  // Base price and inventory satisfying constraints
  const basePrice: number & tags.Minimum<0> = 1000 as number & tags.Minimum<0>;
  const baseInventory: number & tags.Type<"int32"> & tags.Minimum<0> =
    10 as number & tags.Type<"int32"> & tags.Minimum<0>;

  // SKU A: in_stock + active
  const skuABody = {
    code: `SKU-A-${RandomGenerator.alphaNumeric(6)}`,
    barcode: RandomGenerator.alphaNumeric(12),
    status: "active",
    price: basePrice,
    original_price: basePrice,
    inventory_quantity: baseInventory,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inStockState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const skuA: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuABody,
    });
  typia.assert(skuA);

  // SKU B: in_stock + draft
  const skuBBody = {
    code: `SKU-B-${RandomGenerator.alphaNumeric(6)}`,
    barcode: RandomGenerator.alphaNumeric(12),
    status: "draft",
    price: basePrice,
    original_price: basePrice,
    inventory_quantity: baseInventory,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inStockState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const skuB: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuBBody,
    });
  typia.assert(skuB);

  // SKU C: preorder + active
  const skuCBody = {
    code: `SKU-C-${RandomGenerator.alphaNumeric(6)}`,
    barcode: RandomGenerator.alphaNumeric(12),
    status: "active",
    price: basePrice,
    original_price: basePrice,
    inventory_quantity: baseInventory,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: preorderState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const skuC: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCBody,
    });
  typia.assert(skuC);

  // 10. Switch back to admin
  const adminLogin2: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin2);

  // 11. Admin searches SKUs with combined filters
  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    productId: product.id,
    statusList: ["active", "inactive"],
    inventoryStateCode: inStockState.code,
  } satisfies IShoppingMallSku.IRequest;

  const page: IPageIShoppingMallSku.ISummary =
    await api.functional.shoppingMall.admin.skus.index(connection, {
      body: requestBody,
    });
  typia.assert(page);

  // 12. Pagination metadata checks
  TestValidator.equals(
    "pagination current matches requested page",
    page.pagination.current,
    requestBody.page,
  );
  TestValidator.equals(
    "pagination limit matches requested pageSize",
    page.pagination.limit,
    requestBody.pageSize,
  );

  // 13. Result set checks: only SKU A should match filters
  const data = page.data;

  TestValidator.equals(
    "exactly one SKU should match combined filters",
    data.length,
    1,
  );

  const summary = data[0];

  TestValidator.equals(
    "returned SKU id should equal SKU A id",
    summary.id,
    skuA.id,
  );
  TestValidator.equals(
    "returned SKU code should equal SKU A code",
    summary.code,
    skuA.code,
  );

  const containsB = data.some((s) => s.id === skuB.id);
  const containsC = data.some((s) => s.id === skuC.id);

  TestValidator.equals(
    "SKU B should not be included due to wrong status",
    containsB,
    false,
  );
  TestValidator.equals(
    "SKU C should not be included due to wrong inventory state",
    containsC,
    false,
  );
}
