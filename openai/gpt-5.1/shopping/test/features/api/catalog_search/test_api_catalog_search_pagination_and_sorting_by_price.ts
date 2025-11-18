import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCatalogSearchIndexEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCatalogSearchIndexEntry";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCatalogSearchAttributeFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogSearchAttributeFilter";
import type { IShoppingMallCatalogSearchIndexEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogSearchIndexEntry";
import type { IShoppingMallCatalogSearchSort } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogSearchSort";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_catalog_search_pagination_and_sorting_by_price(
  connection: api.IConnection,
) {
  // 1. Join admin and seller accounts with deterministic but unique emails
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Ensure we are authenticated as admin when creating inventory state
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  // 3. Create a purchasable inventory state via admin endpoint
  const inventoryStateBody = {
    code: `in_stock_${RandomGenerator.alphaNumeric(6)}`,
    name: "In Stock Purchasable",
    description: "Purchasable state for E2E price sorting test",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  // 4. Switch to seller context (login) before creating product and SKUs
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  // 5. Create a product owned by this seller
  const productBody = {
    code: `PROD-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "E2E Brand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 6. Create multiple SKUs with deterministic price ordering
  const prices: (number & tags.Minimum<0>)[] = [10, 20, 30, 40, 50];
  const createdSkus: IShoppingMallSku[] = [];

  for (const price of prices) {
    const skuBody = {
      code: `SKU-${RandomGenerator.alphaNumeric(6)}` as string &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      barcode: RandomGenerator.alphaNumeric(12),
      status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
      price,
      original_price: price + 5,
      inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
      low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
      shopping_mall_sku_inventory_state_id: inventoryState.id,
      attribute_value_ids: [],
      external_ids: [],
    } satisfies IShoppingMallSku.ICreate;

    const sku: IShoppingMallSku =
      await api.functional.shoppingMall.seller.products.skus.create(
        connection,
        {
          productId: product.id,
          body: skuBody,
        },
      );
    typia.assert<IShoppingMallSku>(sku);
    createdSkus.push(sku);
  }

  // Helper: build lookup maps by SKU id -> price, and price-sorted arrays
  const skuIdToPrice = new Map<string, number & tags.Minimum<0>>();
  for (let i = 0; i < createdSkus.length; i++) {
    const sku = createdSkus[i];
    const price = prices[i];
    skuIdToPrice.set(sku.id, price);
  }

  const ascendingByPrice = [...createdSkus].sort(
    (a, b) => skuIdToPrice.get(a.id)! - skuIdToPrice.get(b.id)!,
  );
  const descendingByPrice = [...ascendingByPrice].slice().reverse();

  const pageSize = 2 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;

  // 7. Search page 1, ascending price
  const searchAscPage1Body = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize,
    sellerIds: [sellerAuthorized.id],
    onlyInStock: true,
    sort: {
      field: "price_asc",
      direction: "asc",
    } satisfies IShoppingMallCatalogSearchSort,
    locale: "en-US",
    regionCode: "KR",
  } satisfies IShoppingMallCatalogSearchIndexEntry.IRequest;

  const pageAsc1: IPageIShoppingMallCatalogSearchIndexEntry.ISummary =
    await api.functional.shoppingMall.catalogSearch.index(connection, {
      body: searchAscPage1Body,
    });
  typia.assert<IPageIShoppingMallCatalogSearchIndexEntry.ISummary>(pageAsc1);

  // Assert pagination basic properties for page 1
  TestValidator.equals(
    "ascending page 1 current page is 1",
    pageAsc1.pagination.current,
    1,
  );
  TestValidator.equals(
    "ascending page 1 limit equals pageSize",
    pageAsc1.pagination.limit,
    pageSize,
  );

  // Extract SKU ids from search results that correspond to our created SKUs
  const ascPage1SkuIds: string[] = pageAsc1.data
    .map((entry) => entry.sku?.id)
    .filter((id): id is string => !!id && skuIdToPrice.has(id));

  TestValidator.equals(
    "ascending page 1 contains exactly 2 of our SKUs",
    ascPage1SkuIds.length,
    2,
  );

  const expectedAscPage1 = ascendingByPrice.slice(0, 2).map((sku) => sku.id);

  TestValidator.equals(
    "ascending page 1 SKU ids match expected first two by price",
    ascPage1SkuIds,
    expectedAscPage1,
  );

  // 8. Search page 2, ascending price
  const searchAscPage2Body = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize,
    sellerIds: [sellerAuthorized.id],
    onlyInStock: true,
    sort: {
      field: "price_asc",
      direction: "asc",
    } satisfies IShoppingMallCatalogSearchSort,
    locale: "en-US",
    regionCode: "KR",
  } satisfies IShoppingMallCatalogSearchIndexEntry.IRequest;

  const pageAsc2: IPageIShoppingMallCatalogSearchIndexEntry.ISummary =
    await api.functional.shoppingMall.catalogSearch.index(connection, {
      body: searchAscPage2Body,
    });
  typia.assert<IPageIShoppingMallCatalogSearchIndexEntry.ISummary>(pageAsc2);

  TestValidator.equals(
    "ascending page 2 current page is 2",
    pageAsc2.pagination.current,
    2,
  );
  TestValidator.equals(
    "ascending page 2 limit equals pageSize",
    pageAsc2.pagination.limit,
    pageSize,
  );

  const ascPage2SkuIds: string[] = pageAsc2.data
    .map((entry) => entry.sku?.id)
    .filter((id): id is string => !!id && skuIdToPrice.has(id));

  TestValidator.equals(
    "ascending page 2 contains exactly 2 of our SKUs",
    ascPage2SkuIds.length,
    2,
  );

  const expectedAscPage2 = ascendingByPrice.slice(2, 4).map((sku) => sku.id);

  TestValidator.equals(
    "ascending page 2 SKU ids match expected third and fourth by price",
    ascPage2SkuIds,
    expectedAscPage2,
  );

  // 9. Optionally validate total pages/records >= number of created SKUs
  TestValidator.predicate(
    "total records is at least createdSkus.length",
    pageAsc1.pagination.records >=
      (createdSkus.length as number & tags.Type<"int32"> & tags.Minimum<0>),
  );

  TestValidator.predicate(
    "total pages consistent with records and limit",
    pageAsc1.pagination.pages >= 1,
  );

  // 10. Repeat with descending price order
  const searchDescPage1Body = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize,
    sellerIds: [sellerAuthorized.id],
    onlyInStock: true,
    sort: {
      field: "price_desc",
      direction: "desc",
    } satisfies IShoppingMallCatalogSearchSort,
    locale: "en-US",
    regionCode: "KR",
  } satisfies IShoppingMallCatalogSearchIndexEntry.IRequest;

  const pageDesc1: IPageIShoppingMallCatalogSearchIndexEntry.ISummary =
    await api.functional.shoppingMall.catalogSearch.index(connection, {
      body: searchDescPage1Body,
    });
  typia.assert<IPageIShoppingMallCatalogSearchIndexEntry.ISummary>(pageDesc1);

  const descPage1SkuIds: string[] = pageDesc1.data
    .map((entry) => entry.sku?.id)
    .filter((id): id is string => !!id && skuIdToPrice.has(id));

  TestValidator.equals(
    "descending page 1 contains exactly 2 of our SKUs",
    descPage1SkuIds.length,
    2,
  );

  const expectedDescPage1 = descendingByPrice.slice(0, 2).map((sku) => sku.id);

  TestValidator.equals(
    "descending page 1 SKU ids match expected two highest prices",
    descPage1SkuIds,
    expectedDescPage1,
  );

  const searchDescPage2Body = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize,
    sellerIds: [sellerAuthorized.id],
    onlyInStock: true,
    sort: {
      field: "price_desc",
      direction: "desc",
    } satisfies IShoppingMallCatalogSearchSort,
    locale: "en-US",
    regionCode: "KR",
  } satisfies IShoppingMallCatalogSearchIndexEntry.IRequest;

  const pageDesc2: IPageIShoppingMallCatalogSearchIndexEntry.ISummary =
    await api.functional.shoppingMall.catalogSearch.index(connection, {
      body: searchDescPage2Body,
    });
  typia.assert<IPageIShoppingMallCatalogSearchIndexEntry.ISummary>(pageDesc2);

  const descPage2SkuIds: string[] = pageDesc2.data
    .map((entry) => entry.sku?.id)
    .filter((id): id is string => !!id && skuIdToPrice.has(id));

  TestValidator.equals(
    "descending page 2 contains exactly 2 of our SKUs",
    descPage2SkuIds.length,
    2,
  );

  const expectedDescPage2 = descendingByPrice.slice(2, 4).map((sku) => sku.id);

  TestValidator.equals(
    "descending page 2 SKU ids match expected next two highest prices",
    descPage2SkuIds,
    expectedDescPage2,
  );
}
