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

export async function test_api_admin_product_sku_search_with_filters(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.test/join" as string & tags.Format<"uri">,
    referrer: "https://admin.test/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoin);

  // 2. Seller join
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.test/join" as string & tags.Format<"uri">,
    referrer: "https://seller.test/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoin);

  // 3. Seller creates product
  const productBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "ACME",
    model_name: "MODEL-X",
    status: "active",
    primary_image_uri: "https://cdn.test/image.png" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productBody,
    },
  );
  typia.assert<IShoppingMallProduct>(product);

  // 4. Admin login to perform admin actions
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.test/login" as string & tags.Format<"uri">,
    referrer: "https://admin.test/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  // 5. Create category and link to product
  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
    name_en: "Test Category",
    description_en: "Test category description",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    { body: categoryBody },
  );
  typia.assert<IShoppingMallCategory>(category);

  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productCategory);

  // 6. Create inventory states as admin
  const inStockStateBody = {
    code: `in_stock_${RandomGenerator.alphaNumeric(4)}`,
    name: "In Stock",
    description: "In stock state",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inStockState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: inStockStateBody },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inStockState);

  const lowStockStateBody = {
    code: `low_stock_${RandomGenerator.alphaNumeric(4)}`,
    name: "Low Stock",
    description: "Low stock state",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const lowStockState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: lowStockStateBody },
    );
  typia.assert<IShoppingMallSkuInventoryState>(lowStockState);

  // 7. Seller login to create SKUs
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.test/login" as string & tags.Format<"uri">,
    referrer: "https://seller.test/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin = await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  // Prices and inventory setup for filter band
  const basePrice = 100;
  const minPrice = 80;
  const maxPrice = 150;

  const lowStockThreshold = 5 as number & tags.Type<"int32"> & tags.Minimum<0>;

  // skuA: active, in band, low stock, in_stock state
  const skuABody = {
    code: `SKU-A-${RandomGenerator.alphaNumeric(4)}`,
    barcode: null,
    status: "active",
    price: basePrice,
    original_price: basePrice + 20,
    inventory_quantity: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: lowStockThreshold,
    shopping_mall_sku_inventory_state_id: inStockState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const skuA = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: skuABody,
    },
  );
  typia.assert<IShoppingMallSku>(skuA);

  // skuB: active, in band, NOT low stock, in_stock state
  const skuBBody = {
    code: `SKU-B-${RandomGenerator.alphaNumeric(4)}`,
    barcode: null,
    status: "active",
    price: basePrice + 10,
    original_price: basePrice + 30,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: lowStockThreshold,
    shopping_mall_sku_inventory_state_id: inStockState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const skuB = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: skuBBody,
    },
  );
  typia.assert<IShoppingMallSku>(skuB);

  // skuC: draft, in band, low stock, in_stock state
  const skuCBody = {
    code: `SKU-C-${RandomGenerator.alphaNumeric(4)}`,
    barcode: null,
    status: "draft",
    price: basePrice + 5,
    original_price: basePrice + 25,
    inventory_quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: lowStockThreshold,
    shopping_mall_sku_inventory_state_id: inStockState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const skuC = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: skuCBody,
    },
  );
  typia.assert<IShoppingMallSku>(skuC);

  // skuD: active, in band, low stock, low_stock state
  const skuDBody = {
    code: `SKU-D-${RandomGenerator.alphaNumeric(4)}`,
    barcode: null,
    status: "active",
    price: basePrice + 20,
    original_price: basePrice + 40,
    inventory_quantity: 3 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: lowStockThreshold,
    shopping_mall_sku_inventory_state_id: lowStockState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const skuD = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: skuDBody,
    },
  );
  typia.assert<IShoppingMallSku>(skuD);

  // skuE: active, price out of band, low stock, in_stock state
  const skuEBody = {
    code: `SKU-E-${RandomGenerator.alphaNumeric(4)}`,
    barcode: null,
    status: "active",
    price: basePrice + 100,
    original_price: basePrice + 120,
    inventory_quantity: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: lowStockThreshold,
    shopping_mall_sku_inventory_state_id: inStockState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const skuE = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: skuEBody,
    },
  );
  typia.assert<IShoppingMallSku>(skuE);

  const createdSkus = [skuA, skuB, skuC, skuD, skuE];

  // 8. Switch back to admin for search
  const adminLoginAgain = await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginAgain);

  // 9. Call admin SKU search with combined filters
  const requestPage = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const requestPageSize = 20 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const skuFilterBody = {
    page: requestPage,
    pageSize: requestPageSize,
    productId: undefined,
    status: "active",
    statusList: undefined,
    inventoryStateCode: inStockState.code,
    minPrice,
    maxPrice,
    minInventoryQuantity: undefined,
    maxInventoryQuantity: undefined,
    lowStockOnly: true,
    includeDeleted: false,
    createdFrom: undefined,
    createdTo: undefined,
    updatedFrom: undefined,
    updatedTo: undefined,
    sortField: "price",
    sortDirection: "asc",
  } satisfies IShoppingMallSku.IRequest;

  const page = await api.functional.shoppingMall.admin.products.skus.index(
    connection,
    {
      productId: product.id,
      body: skuFilterBody,
    },
  );
  typia.assert<IPageIShoppingMallSku.ISummary>(page);

  // 10. Basic pagination assertions
  TestValidator.equals(
    "pagination current page should be 1",
    page.pagination.current,
    requestPage,
  );
  TestValidator.equals(
    "pagination limit should equal pageSize",
    page.pagination.limit,
    requestPageSize,
  );

  // Determine expected SKUs according to filter logic in memory
  const expected = createdSkus.filter((sku) => {
    const isStatusActive = sku.status === "active";
    const inPriceBand = sku.price >= minPrice && sku.price <= maxPrice;
    const isLowStock =
      sku.low_stock_threshold !== null && sku.low_stock_threshold !== undefined
        ? sku.inventory_quantity <= sku.low_stock_threshold
        : false;
    const inventoryStateMatches =
      sku.inventory_state.code === inStockState.code;
    return isStatusActive && inPriceBand && isLowStock && inventoryStateMatches;
  });

  // 11. Assert that only expected SKUs are returned
  TestValidator.equals(
    "number of returned SKUs matches expected filtered count",
    page.data.length,
    expected.length,
  );

  for (const returned of page.data) {
    const found = expected.find((sku) => sku.id === returned.id);
    TestValidator.predicate(
      "returned SKU must be one of expected IDs",
      found !== undefined,
    );

    if (found !== undefined) {
      TestValidator.equals(
        "returned SKU code matches expected code",
        returned.code,
        found.code,
      );
      TestValidator.predicate(
        "returned SKU price is within band",
        found.price >= minPrice && found.price <= maxPrice,
      );
      const isLowStock =
        found.low_stock_threshold !== null &&
        found.low_stock_threshold !== undefined
          ? found.inventory_quantity <= found.low_stock_threshold
          : false;
      TestValidator.predicate(
        "returned SKU is low stock according to threshold",
        isLowStock,
      );
      TestValidator.equals(
        "returned SKU inventory state code matches filter",
        found.inventory_state.code,
        inStockState.code,
      );
      TestValidator.equals(
        "returned SKU status is active",
        found.status,
        "active",
      );
    }
  }

  // 12. Ensure excluded SKUs are not present
  const returnedIds = page.data.map((d) => d.id);
  const excluded = createdSkus.filter(
    (sku) => !expected.some((e) => e.id === sku.id),
  );
  for (const sku of excluded) {
    TestValidator.predicate(
      "excluded SKU should not be in response",
      returnedIds.includes(sku.id) === false,
    );
  }

  // 13. If multiple expected SKUs, verify sorting by ascending price
  if (page.data.length >= 2) {
    for (let i = 1; i < page.data.length; i++) {
      const prevFull = createdSkus.find(
        (sku) => sku.id === page.data[i - 1].id,
      );
      const currFull = createdSkus.find((sku) => sku.id === page.data[i].id);

      if (prevFull !== undefined && currFull !== undefined) {
        TestValidator.predicate(
          "SKUs should be sorted by non-decreasing price",
          prevFull.price <= currFull.price,
        );
      }
    }
  }
}
