import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSkuExternalId";
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

export async function test_api_admin_sku_external_ids_search_pagination_across_pages(
  connection: api.IConnection,
) {
  // 1. Admin join
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
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoinOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoinOutput);

  // 1-2. Admin login to ensure login endpoint and refresh Authorization header
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginOutput);

  // 2. Seller join
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
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoinOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoinOutput);

  // 2-2. Seller login
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginOutput);

  // 3-a. As admin, create category
  const adminReLoginForCategory: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminReLoginForCategory);

  const categoryCreateBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
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

  // 3-b. As seller, create product
  const sellerReLoginForProduct: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerReLoginForProduct);

  const productCreateBody = {
    code: `PROD-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 3-c. As admin, attach product to category (is_primary=true)
  const adminReLoginForProductCategory: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminReLoginForProductCategory);

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

  // 3-d. As admin, create inventory state
  const adminReLoginForInventory: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminReLoginForInventory);

  const inventoryStateCreateBody = {
    code: `INV-${RandomGenerator.alphaNumeric(6)}`,
    name: "In Stock",
    description: "Inventory state for in-stock items",
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

  // 3-e. As seller, create SKU referencing the inventory state
  const sellerReLoginForSku: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerReLoginForSku);

  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    barcode: null,
    status: "active",
    price: 1000,
    original_price: null,
    inventory_quantity: 100,
    low_stock_threshold: 10,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 4. As admin, bulk create external IDs for this SKU
  const adminReLoginForExternalIds: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminReLoginForExternalIds);

  const totalExternalIds = 25;
  const createdExternalIds: IShoppingMallSkuExternalId[] = [];

  for (let i = 0; i < totalExternalIds; i++) {
    const externalIdCreateBody = {
      system_code: "SYS",
      external_id: `EXT-${i.toString().padStart(3, "0")}`,
    } satisfies IShoppingMallSkuExternalId.ICreate;

    const created: IShoppingMallSkuExternalId =
      await api.functional.shoppingMall.admin.skus.externalIds.create(
        connection,
        {
          skuId: sku.id,
          body: externalIdCreateBody,
        },
      );
    typia.assert(created);
    createdExternalIds.push(created);
  }

  // 5. Pagination tests via PATCH /shoppingMall/admin/skus/{skuId}/externalIds
  const pageSize = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const makeRequestBody = (
    page: number & tags.Type<"int32"> & tags.Minimum<1>,
  ) =>
    ({
      system_code: null,
      external_id: null,
      page,
      limit: pageSize,
      order_by: "created_at",
      order_direction: "asc",
    }) satisfies IShoppingMallSkuExternalId.IRequest;

  // Page 1
  const page1Response: IPageIShoppingMallSkuExternalId.ISummary =
    await api.functional.shoppingMall.admin.skus.externalIds.index(connection, {
      skuId: sku.id,
      body: makeRequestBody(1 as number & tags.Type<"int32"> & tags.Minimum<1>),
    });
  typia.assert(page1Response);

  const page1 = page1Response.pagination;
  const page1Data = page1Response.data;

  TestValidator.equals("page 1 current page", page1.current, 1);
  TestValidator.equals("page 1 limit", page1.limit, pageSize);
  TestValidator.predicate(
    "page 1 records >= totalExternalIds",
    () => page1.records >= totalExternalIds,
  );
  TestValidator.predicate("page 1 pages >= 3", () => page1.pages >= 3);
  TestValidator.equals("page 1 data length", page1Data.length, pageSize);

  const page1Ids = page1Data.map((item) => item.id);

  // Page 2
  const page2Response: IPageIShoppingMallSkuExternalId.ISummary =
    await api.functional.shoppingMall.admin.skus.externalIds.index(connection, {
      skuId: sku.id,
      body: makeRequestBody(2 as number & tags.Type<"int32"> & tags.Minimum<1>),
    });
  typia.assert(page2Response);

  const page2 = page2Response.pagination;
  const page2Data = page2Response.data;

  TestValidator.equals("page 2 current page", page2.current, 2);
  TestValidator.equals("page 2 limit", page2.limit, pageSize);
  TestValidator.equals("page 2 data length", page2Data.length, pageSize);

  const page2Ids = page2Data.map((item) => item.id);

  // Ensure no overlap between page 1 and page 2
  const overlapPage1And2 = page1Ids.filter((id) => page2Ids.includes(id));
  TestValidator.equals(
    "no overlap between page 1 and page 2",
    overlapPage1And2.length,
    0,
  );

  // Page 3
  const page3Response: IPageIShoppingMallSkuExternalId.ISummary =
    await api.functional.shoppingMall.admin.skus.externalIds.index(connection, {
      skuId: sku.id,
      body: makeRequestBody(3 as number & tags.Type<"int32"> & tags.Minimum<1>),
    });
  typia.assert(page3Response);

  const page3 = page3Response.pagination;
  const page3Data = page3Response.data;

  TestValidator.equals("page 3 current page", page3.current, 3);
  const expectedLastPageSize = totalExternalIds - 2 * pageSize;
  TestValidator.equals(
    "page 3 data length",
    page3Data.length,
    expectedLastPageSize,
  );

  const page3Ids = page3Data.map((item) => item.id);

  const overlapPage1And3 = page1Ids.filter((id) => page3Ids.includes(id));
  const overlapPage2And3 = page2Ids.filter((id) => page3Ids.includes(id));
  TestValidator.equals(
    "no overlap between page 1 and page 3",
    overlapPage1And3.length,
    0,
  );
  TestValidator.equals(
    "no overlap between page 2 and page 3",
    overlapPage2And3.length,
    0,
  );

  // Global assertions: union of page IDs equals all created IDs
  const paginatedIds = [...page1Ids, ...page2Ids, ...page3Ids];
  TestValidator.equals(
    "total number of paginated IDs equals createdExternalIds length",
    paginatedIds.length,
    createdExternalIds.length,
  );

  const createdIdSet = new Set(createdExternalIds.map((e) => e.id));
  const paginatedIdSet = new Set(paginatedIds);

  TestValidator.equals(
    "all created IDs are present in paginated IDs",
    paginatedIdSet.size,
    createdIdSet.size,
  );

  TestValidator.predicate("every created ID is included in paginated IDs", () =>
    createdExternalIds.every((e) => paginatedIdSet.has(e.id)),
  );

  // 5-5. Optional out-of-range page (page=999) expecting empty data
  const page999Response: IPageIShoppingMallSkuExternalId.ISummary =
    await api.functional.shoppingMall.admin.skus.externalIds.index(connection, {
      skuId: sku.id,
      body: makeRequestBody(
        999 as number & tags.Type<"int32"> & tags.Minimum<1>,
      ),
    });
  typia.assert(page999Response);

  const page999 = page999Response.pagination;
  const page999Data = page999Response.data;

  TestValidator.equals("page 999 current page", page999.current, 999);
  TestValidator.equals("page 999 data length is 0", page999Data.length, 0);
}
