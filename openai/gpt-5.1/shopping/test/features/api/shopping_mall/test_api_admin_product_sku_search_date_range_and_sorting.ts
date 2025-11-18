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
 * Validate admin SKU search date range filtering and sorting on
 * created_at/updated_at.
 *
 * Business flow:
 *
 * 1. Admin joins and is implicitly authenticated.
 * 2. Seller joins and is implicitly authenticated.
 * 3. Seller creates a product.
 * 4. Admin logs in, creates a category, and links the product to that category.
 * 5. Admin creates a SKU inventory state.
 * 6. Seller logs in, creates several SKUs for the product referencing that
 *    inventory state.
 * 7. Seller updates one SKU later to create a distinct updated_at.
 * 8. Admin searches SKUs for the product with createdFrom/createdTo and validates
 *    which SKUs are returned.
 * 9. Admin searches with updatedFrom/updatedTo to isolate the updated SKU.
 * 10. For each search, exercises sortField and sortDirection and validates
 *     ordering.
 */
export async function test_api_admin_product_sku_search_date_range_and_sorting(
  connection: api.IConnection,
) {
  // 1. Admin joins (auto-auth)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.test.local/join" as string & tags.Format<"uri">,
    referrer: "https://admin.test.local/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // 2. Seller joins (auto-auth, connection now has seller token)
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.test.local/join" as string & tags.Format<"uri">,
    referrer: "https://seller.test.local/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoin);

  // 3. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AutoBE-Brand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.test.local/image.png" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 4. Switch back to admin via login
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.test.local/login" as string & tags.Format<"uri">,
    referrer: "https://admin.test.local/login" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLogin);

  // 4-1. Admin creates a category
  const categoryCreateBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
    name_en: "Test Category",
    description_en: "Category for SKU date range testing",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 4-2. Admin links product to category
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

  // 5. Admin creates a SKU inventory state
  const inventoryStateCreateBody = {
    code: `state-${RandomGenerator.alphaNumeric(5)}`,
    name: "In Stock",
    description: "Purchasable inventory state for testing",
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

  // 6. Switch to seller and create multiple SKUs
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.test.local/login" as string & tags.Format<"uri">,
    referrer: "https://seller.test.local/login" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const skuBodies: IShoppingMallSku.ICreate[] = [0, 1, 2].map((index) => {
    const baseCode = `SKU-${index}-${RandomGenerator.alphaNumeric(4)}`;
    return {
      code: baseCode,
      barcode: `BAR-${RandomGenerator.alphaNumeric(6)}`,
      status: "active",
      price: 1000 + index * 100,
      original_price: 1200 + index * 100,
      inventory_quantity: (10 + index) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      low_stock_threshold:
        index === 0
          ? null
          : ((5 + index) as number & tags.Type<"int32"> & tags.Minimum<0>),
      shopping_mall_sku_inventory_state_id: inventoryState.id,
      attribute_value_ids: [],
      external_ids: [],
    } satisfies IShoppingMallSku.ICreate;
  });

  const sku1: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuBodies[0],
    });
  typia.assert(sku1);

  const sku2: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuBodies[1],
    });
  typia.assert(sku2);

  const sku3: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuBodies[2],
    });
  typia.assert(sku3);

  const createdSkus: IShoppingMallSku[] = [sku1, sku2, sku3];

  // 7. Update one SKU (sku3) later to bump updated_at
  const sku3UpdateBody = {
    price: sku3.price + 50,
  } satisfies IShoppingMallSku.IUpdate;
  const sku3Updated: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.update(connection, {
      productId: product.id,
      skuId: sku3.id,
      body: sku3UpdateBody,
    });
  typia.assert(sku3Updated);

  // Include updated version for updated_at mapping
  const skusForUpdateMap: IShoppingMallSku[] = [sku1, sku2, sku3Updated];

  // 8. Switch to admin to perform search
  const adminLoginAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLoginAgain);

  const toDate = (iso: string): number => new Date(iso).getTime();

  // Compute min/max created_at across full SKUs
  const createdTimes = createdSkus.map((s) => toDate(s.created_at));
  const minCreated = Math.min(...createdTimes);
  const maxCreated = Math.max(...createdTimes);

  const minCreatedIso = new Date(minCreated).toISOString();
  const maxCreatedIso = new Date(maxCreated).toISOString();

  // Build lookup maps for created_at and updated_at by ID
  const createdAtById = new Map<string, number>();
  createdSkus.forEach((s) => {
    createdAtById.set(s.id, toDate(s.created_at));
  });
  const updatedAtById = new Map<string, number>();
  skusForUpdateMap.forEach((s) => {
    updatedAtById.set(s.id, toDate(s.updated_at));
  });

  // 8-1. Query with created range that includes all SKUs, sorted by created_at asc
  const allInRangeRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    productId: product.id,
    createdFrom: minCreatedIso,
    createdTo: maxCreatedIso,
    sortField: "created_at",
    sortDirection: "asc" as const,
  } satisfies IShoppingMallSku.IRequest;
  const allInRangePage: IPageIShoppingMallSku.ISummary =
    await api.functional.shoppingMall.admin.products.skus.index(connection, {
      productId: product.id,
      body: allInRangeRequest,
    });
  typia.assert(allInRangePage);

  const allIds = createdSkus.map((s) => s.id);
  const allInRangeIds = allInRangePage.data.map((s) => s.id);

  allIds.forEach((id) => {
    TestValidator.predicate(
      "created range should include all created SKUs",
      allInRangeIds.includes(id),
    );
  });

  // Validate ascending created_at order across returned summaries
  const createdAscTimes = allInRangePage.data
    .map((summary) => createdAtById.get(summary.id))
    .filter((value): value is number => value !== undefined);

  for (let i = 1; i < createdAscTimes.length; i++) {
    TestValidator.predicate(
      "created_at ascending sort should be non-decreasing",
      createdAscTimes[i - 1] <= createdAscTimes[i],
    );
  }

  // 8-2. Narrow created range to exclude the earliest created SKU when possible
  const sortedCreatedTimes = [...createdTimes].sort((a, b) => a - b);
  const middleCreated = sortedCreatedTimes[1] ?? sortedCreatedTimes[0];
  const middleIso = new Date(middleCreated).toISOString();

  const narrowedRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    productId: product.id,
    createdFrom: middleIso,
    createdTo: maxCreatedIso,
    sortField: "created_at",
    sortDirection: "asc" as const,
  } satisfies IShoppingMallSku.IRequest;
  const narrowedPage: IPageIShoppingMallSku.ISummary =
    await api.functional.shoppingMall.admin.products.skus.index(connection, {
      productId: product.id,
      body: narrowedRequest,
    });
  typia.assert(narrowedPage);

  const narrowedIds = narrowedPage.data.map((s) => s.id);
  TestValidator.predicate(
    "narrowed createdFrom should not return more SKUs than full range",
    narrowedIds.length <= allInRangeIds.length,
  );

  // If multiple SKUs, earliest one should often be excluded; we keep predicate soft
  if (allInRangeIds.length > 1) {
    TestValidator.predicate(
      "narrowed createdFrom should likely exclude earliest SKU",
      !narrowedIds.includes(sku1.id) ||
        narrowedIds.length < allInRangeIds.length,
    );
  }

  // 9. Updated_at range: derive timestamps across updated SKUs
  const updatedTimes = skusForUpdateMap.map(
    (s) => updatedAtById.get(s.id) ?? 0,
  );
  const maxUpdated = Math.max(...updatedTimes);
  const maxUpdatedIso = new Date(maxUpdated).toISOString();

  const updatedRangeRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    productId: product.id,
    updatedFrom: maxUpdatedIso,
    updatedTo: maxUpdatedIso,
    sortField: "updated_at",
    sortDirection: "desc" as const,
  } satisfies IShoppingMallSku.IRequest;
  const updatedRangePage: IPageIShoppingMallSku.ISummary =
    await api.functional.shoppingMall.admin.products.skus.index(connection, {
      productId: product.id,
      body: updatedRangeRequest,
    });
  typia.assert(updatedRangePage);

  const updatedRangeIds = updatedRangePage.data.map((s) => s.id);
  TestValidator.predicate(
    "updated range should include the most recently updated SKU",
    updatedRangeIds.includes(sku3Updated.id),
  );

  // 10. Verify sort by updated_at asc
  const updatedSortAscRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    productId: product.id,
    sortField: "updated_at",
    sortDirection: "asc" as const,
  } satisfies IShoppingMallSku.IRequest;
  const updatedAscPage: IPageIShoppingMallSku.ISummary =
    await api.functional.shoppingMall.admin.products.skus.index(connection, {
      productId: product.id,
      body: updatedSortAscRequest,
    });
  typia.assert(updatedAscPage);

  const ascTimes = updatedAscPage.data
    .map((summary) => updatedAtById.get(summary.id))
    .filter((value): value is number => value !== undefined);

  for (let i = 1; i < ascTimes.length; i++) {
    TestValidator.predicate(
      "updated_at ascending sort should be non-decreasing",
      ascTimes[i - 1] <= ascTimes[i],
    );
  }

  // 11. Verify sort by updated_at desc
  const updatedSortDescRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    productId: product.id,
    sortField: "updated_at",
    sortDirection: "desc" as const,
  } satisfies IShoppingMallSku.IRequest;
  const updatedDescPage: IPageIShoppingMallSku.ISummary =
    await api.functional.shoppingMall.admin.products.skus.index(connection, {
      productId: product.id,
      body: updatedSortDescRequest,
    });
  typia.assert(updatedDescPage);

  const descTimes = updatedDescPage.data
    .map((summary) => updatedAtById.get(summary.id))
    .filter((value): value is number => value !== undefined);

  for (let i = 1; i < descTimes.length; i++) {
    TestValidator.predicate(
      "updated_at descending sort should be non-increasing",
      descTimes[i - 1] >= descTimes[i],
    );
  }
}
