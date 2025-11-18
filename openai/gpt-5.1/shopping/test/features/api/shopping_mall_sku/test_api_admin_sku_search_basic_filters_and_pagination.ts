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
 * Validate that admin SKU search supports basic filters and pagination.
 *
 * Business flow:
 *
 * 1. Admin joins and becomes authenticated.
 * 2. Admin creates an inventory state (e.g., "in_stock").
 * 3. Seller joins and becomes authenticated.
 * 4. Seller creates a product.
 * 5. Admin logs in again, creates a category and links the product to it.
 * 6. Seller logs back in and creates multiple SKUs under the product with varying
 *    status, price, and inventory_quantity but same inventory state.
 * 7. Admin logs back in and searches SKUs via PATCH /shoppingMall/admin/skus using
 *    filters on productId, status, price range and inventory quantity.
 * 8. Validate that the returned page of IShoppingMallSku.ISummary matches the
 *    expected subset and that pagination metadata is consistent.
 */
export async function test_api_admin_sku_search_basic_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Admin joins (becomes authenticated)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // 2. Admin creates an inventory state (in_stock & purchasable)
  const inventoryStateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Standard in-stock purchasable state",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: inventoryStateBody },
    );
  typia.assert(inventoryState);

  // 3. Seller joins and becomes authenticated
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoin);

  // 4. Seller creates a product
  const productBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.name(),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.example.com/image.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 5. Admin logs in again and creates a category, then links product to it
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
    name_en: "Test Category",
    description_en: "Category for SKU search tests",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

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

  // 6. Seller logs back in and creates multiple SKUs
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  type LocalSku = {
    id: string & tags.Format<"uuid">;
    code: string;
    status: string;
    price: number;
    inventory_quantity: number;
  };

  const createdSkus: LocalSku[] = [];

  const skuDefinitions: Array<{
    status: string;
    price: number;
    inventory: number;
  }> = [
    { status: "active", price: 100, inventory: 5 },
    { status: "active", price: 150, inventory: 10 },
    { status: "draft", price: 80, inventory: 3 },
    { status: "draft", price: 300, inventory: 20 },
  ];

  for (const def of skuDefinitions) {
    const skuBody = {
      code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
      barcode: null,
      status: def.status,
      price: def.price,
      original_price: null,
      inventory_quantity: def.inventory as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      low_stock_threshold: null,
      shopping_mall_sku_inventory_state_id: inventoryState.id,
      attribute_value_ids: [],
      external_ids: [],
    } satisfies IShoppingMallSku.ICreate;

    const sku: IShoppingMallSku =
      await api.functional.shoppingMall.seller.products.skus.create(
        connection,
        {
          productId: product.id as string & tags.Format<"uuid">,
          body: skuBody,
        },
      );
    typia.assert(sku);

    createdSkus.push({
      id: sku.id,
      code: sku.code,
      status: sku.status,
      price: sku.price,
      inventory_quantity: sku.inventory_quantity,
    });
  }

  // 7. Admin logs back in and searches SKUs with filters & pagination
  const adminLogin2: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin2);

  const minPrice = 90;
  const maxPrice = 200;
  const minInventory = 4;

  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    productId: product.id,
    status: "active",
    statusList: undefined,
    inventoryStateCode: undefined,
    minPrice,
    maxPrice,
    minInventoryQuantity: minInventory as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    maxInventoryQuantity: undefined,
    lowStockOnly: false,
    includeDeleted: false,
    createdFrom: undefined,
    createdTo: undefined,
    updatedFrom: undefined,
    updatedTo: undefined,
    sortField: "price",
    sortDirection: "asc",
  } satisfies IShoppingMallSku.IRequest;

  const pageResult: IPageIShoppingMallSku.ISummary =
    await api.functional.shoppingMall.admin.skus.index(connection, {
      body: requestBody,
    });
  typia.assert(pageResult);

  // Compute expected matches in-memory
  const matchingSkus: LocalSku[] = createdSkus.filter((sku) => {
    if (sku.status !== "active") return false;
    if (sku.price < minPrice || sku.price > maxPrice) return false;
    if (sku.inventory_quantity < minInventory) return false;
    return true;
  });

  const expectedRecords = matchingSkus.length;
  const expectedPages =
    expectedRecords === 0
      ? 0
      : Math.ceil(expectedRecords / requestBody.pageSize);

  // 8. Validate pagination metadata
  TestValidator.equals(
    "pagination.current matches requested page",
    pageResult.pagination.current,
    requestBody.page,
  );

  TestValidator.equals(
    "pagination.limit matches requested pageSize",
    pageResult.pagination.limit,
    requestBody.pageSize,
  );

  TestValidator.equals(
    "pagination.records equals in-memory match count",
    pageResult.pagination.records,
    expectedRecords as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  TestValidator.equals(
    "pagination.pages equals ceil(records/limit)",
    pageResult.pagination.pages,
    expectedPages as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  // Validate that returned SKU summaries match filter set
  const pageData = pageResult.data;

  TestValidator.predicate(
    "returned data size must not exceed pageSize",
    pageData.length <= requestBody.pageSize,
  );

  for (const summary of pageData) {
    const found = matchingSkus.find((sku) => sku.id === summary.id);

    TestValidator.predicate(
      "summary corresponds to one of expected SKUs",
      found !== undefined,
    );

    if (found) {
      TestValidator.equals(
        "summary code matches SKU code",
        summary.code,
        found.code,
      );
    }
  }

  // Ensure non-matching SKUs are not present in the result set
  const nonMatchingSkus = createdSkus.filter(
    (sku) => !matchingSkus.some((m) => m.id === sku.id),
  );

  for (const non of nonMatchingSkus) {
    const exists = pageData.some((s) => s.id === non.id);
    TestValidator.predicate(
      "non-matching SKU should not appear in current page",
      exists === false,
    );
  }
}
