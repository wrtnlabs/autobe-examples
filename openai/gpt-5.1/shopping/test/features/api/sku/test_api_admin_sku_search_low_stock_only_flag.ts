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

export async function test_api_admin_sku_search_low_stock_only_flag(
  connection: api.IConnection,
) {
  // 1. Register an admin (auto-authenticated by SDK)
  const adminJoinInput = {
    email: `${RandomGenerator.alphaNumeric(16)}@admin.test.com`,
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.test.com/join",
    referrer: "https://admin.test.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuth);

  // 2. As admin, create an inventory state
  const inventoryStateInput = {
    code: `in_stock_${RandomGenerator.alphaNumeric(8)}`,
    name: "In Stock",
    description: "Stock is available for sale",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: inventoryStateInput },
    );
  typia.assert(inventoryState);

  // 3. Register a seller and authenticate
  const sellerEmail =
    `${RandomGenerator.alphaNumeric(16)}@seller.test.com` as string &
      tags.Format<"email">;
  const sellerJoinInput = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.test.com/join",
    referrer: "https://seller.test.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinInput,
    });
  typia.assert(sellerAuth);

  // Explicit seller login to exercise both join and login flows
  const sellerLoginInput = {
    email: sellerEmail,
    password: sellerJoinInput.password,
    ip: null,
    href: "https://seller.test.com/login",
    referrer: "https://seller.test.com/login-page",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginInput,
    });
  typia.assert(sellerLoginAuth);

  // 4. Seller creates a product
  const productInput = {
    code: `P-${RandomGenerator.alphaNumeric(10)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri:
      "https://cdn.test.com/images/product-primary.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productInput,
    });
  typia.assert(product);

  // 5. Switch back to admin explicitly via login
  const adminLoginInput = {
    email: adminJoinInput.email,
    password: adminJoinInput.password,
    ip: null,
    href: "https://admin.test.com/login",
    referrer: "https://admin.test.com/login-page",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginInput,
    });
  typia.assert(adminLoginAuth);

  // 6. Admin creates a category
  const categoryInput = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "Low Stock Category",
    description_en: "Category for low stock SKU testing",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryInput,
    });
  typia.assert(category);

  // 7. Admin associates the product with the category
  const productCategoryInput = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryInput,
      },
    );
  typia.assert(productCategory);

  // 8. Switch again to seller (for SKU creation)
  const sellerReLoginInput = {
    email: sellerEmail,
    password: sellerJoinInput.password,
    ip: null,
    href: "https://seller.test.com/login",
    referrer: "https://seller.test.com/login-page",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerReAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerReLoginInput,
    });
  typia.assert(sellerReAuth);

  // 9. Create SKU-Low: inventory_quantity <= low_stock_threshold
  const lowThreshold: number & tags.Type<"int32"> & tags.Minimum<0> =
    10 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const lowInventory: number & tags.Type<"int32"> & tags.Minimum<0> =
    5 as number & tags.Type<"int32"> & tags.Minimum<0>;

  const skuLowInput = {
    code: `SKU-LOW-${RandomGenerator.alphaNumeric(6)}`,
    barcode: `B-LOW-${RandomGenerator.alphaNumeric(8)}`,
    status: "active",
    price: 1000,
    original_price: 1200,
    inventory_quantity: lowInventory,
    low_stock_threshold: lowThreshold,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const skuLow: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuLowInput,
    });
  typia.assert(skuLow);

  // 10. Create SKU-Normal: inventory_quantity > low_stock_threshold
  const normalThreshold: number & tags.Type<"int32"> & tags.Minimum<0> =
    10 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const normalInventory: number & tags.Type<"int32"> & tags.Minimum<0> =
    20 as number & tags.Type<"int32"> & tags.Minimum<0>;

  const skuNormalInput = {
    code: `SKU-NORMAL-${RandomGenerator.alphaNumeric(6)}`,
    barcode: `B-NORMAL-${RandomGenerator.alphaNumeric(8)}`,
    status: "active",
    price: 1000,
    original_price: 1200,
    inventory_quantity: normalInventory,
    low_stock_threshold: normalThreshold,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const skuNormal: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuNormalInput,
    });
  typia.assert(skuNormal);

  // 11. Switch back to admin for search
  const adminReLoginInput = {
    email: adminJoinInput.email,
    password: adminJoinInput.password,
    ip: null,
    href: "https://admin.test.com/login",
    referrer: "https://admin.test.com/login-page",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminReAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminReLoginInput,
    });
  typia.assert(adminReAuth);

  // 12. lowStockOnly=true search
  const lowStockRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    productId: product.id,
    status: undefined,
    statusList: undefined,
    inventoryStateCode: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    minInventoryQuantity: undefined,
    maxInventoryQuantity: undefined,
    lowStockOnly: true,
    includeDeleted: false,
    createdFrom: undefined,
    createdTo: undefined,
    updatedFrom: undefined,
    updatedTo: undefined,
    sortField: undefined,
    sortDirection: undefined,
  } satisfies IShoppingMallSku.IRequest;

  const lowStockPage: IPageIShoppingMallSku.ISummary =
    await api.functional.shoppingMall.admin.skus.index(connection, {
      body: lowStockRequest,
    });
  typia.assert(lowStockPage);

  const lowData = lowStockPage.data;

  // Ensure SKU-Low is present and SKU-Normal is absent
  const containsLow = lowData.some((summary) => summary.id === skuLow.id);
  const containsNormal = lowData.some((summary) => summary.id === skuNormal.id);

  TestValidator.predicate(
    "lowStockOnly=true should include SKU-Low",
    containsLow,
  );
  TestValidator.predicate(
    "lowStockOnly=true should not include SKU-Normal",
    !containsNormal,
  );

  // 13. Control search without lowStockOnly (omitted)
  const controlRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    productId: product.id,
    status: undefined,
    statusList: undefined,
    inventoryStateCode: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    minInventoryQuantity: undefined,
    maxInventoryQuantity: undefined,
    includeDeleted: false,
    createdFrom: undefined,
    createdTo: undefined,
    updatedFrom: undefined,
    updatedTo: undefined,
    sortField: undefined,
    sortDirection: undefined,
  } satisfies IShoppingMallSku.IRequest;

  const controlPage: IPageIShoppingMallSku.ISummary =
    await api.functional.shoppingMall.admin.skus.index(connection, {
      body: controlRequest,
    });
  typia.assert(controlPage);

  const controlData = controlPage.data;
  const controlContainsLow = controlData.some(
    (summary) => summary.id === skuLow.id,
  );
  const controlContainsNormal = controlData.some(
    (summary) => summary.id === skuNormal.id,
  );

  TestValidator.predicate(
    "control search should include SKU-Low",
    controlContainsLow,
  );
  TestValidator.predicate(
    "control search should include SKU-Normal",
    controlContainsNormal,
  );

  // 14. Pagination/records sanity checks
  TestValidator.predicate(
    "control.records should be >= lowStockOnly.records",
    controlPage.pagination.records >= lowStockPage.pagination.records,
  );

  TestValidator.predicate(
    "lowStock page limit equals request pageSize",
    lowStockPage.pagination.limit === lowStockRequest.pageSize,
  );

  TestValidator.predicate(
    "control page limit equals request pageSize",
    controlPage.pagination.limit === controlRequest.pageSize,
  );

  // 15. Business rule sanity: every SKU in lowStockOnly results must satisfy
  // inventory_quantity <= low_stock_threshold when low_stock_threshold is not null.
  await ArrayUtil.asyncForEach(lowData, async (summary) => {
    // We only have summary fields here; to avoid non-existent API usage, we
    // limit this check to the known-created SKU-Low, whose full entity we have.
    if (summary.id === skuLow.id) {
      TestValidator.predicate(
        "SKU-Low inventory_quantity <= low_stock_threshold",
        skuLow.inventory_quantity <=
          (skuLow.low_stock_threshold ?? skuLow.inventory_quantity),
      );
    }
  });
}
