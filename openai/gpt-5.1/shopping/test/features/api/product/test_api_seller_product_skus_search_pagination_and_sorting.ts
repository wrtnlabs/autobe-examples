import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSku";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Validate SKU search pagination and sorting for a seller product.
 *
 * Scenario:
 *
 * 1. Register a seller via POST /auth/seller/join and authenticate the connection.
 * 2. Create a product via POST /shoppingMall/seller/products.
 * 3. Create 10 SKUs under the product via POST
 *    /shoppingMall/seller/products/{productId}/skus with deterministically
 *    increasing prices so that we can also verify sortField="price" later if
 *    needed, but we primarily use created_at ordering semantics.
 * 4. Call PATCH /shoppingMall/seller/products/{productId}/skus with
 *    IShoppingMallSku.IRequest:
 *
 *    - Page=1, pageSize=5, sortField="created_at", sortDirection="asc". Verify:
 *
 *         - Pagination.current === 1
 *         - Pagination.limit === 5
 *         - Data length === 5
 * 5. Call the same endpoint with page=2 and same sort options. Verify:
 *
 *    - Pagination.current === 2
 *    - Data length === remaining SKUs (5 in our setup)
 *    - Concatenated data from page1 and page2 covers all created SKUs without
 *         overlap or gaps.
 * 6. Optionally, call again with sortDirection="desc" and page=1 and confirm that
 *    the first page of desc results is the reverse of the first 5 SKUs from asc
 *    order.
 */
export async function test_api_seller_product_skus_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Seller joins and connection becomes authenticated seller
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.dashboard.example.com/join",
    referrer: "https://landing.example.com/seller",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Create a product owned by this seller
  const productBody = {
    code: `SKU-PROD-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AutoBE Test Brand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/product-primary.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 3. Create multiple SKUs (10) with deterministic price increments
  const skuCount = 10;
  const createdSkus: IShoppingMallSku[] = await ArrayUtil.asyncRepeat(
    skuCount,
    async (index) => {
      const basePrice = 1000;
      const priceIncrement = 100;
      const skuPrice = (basePrice + index * priceIncrement) as number;

      const skuBody = {
        code: `SKU-${index + 1}-${RandomGenerator.alphaNumeric(6)}`,
        barcode: `BAR-${RandomGenerator.alphaNumeric(10)}`,
        status: "active",
        price: skuPrice,
        original_price: skuPrice + 50,
        inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
        low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
        shopping_mall_sku_inventory_state_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        attribute_value_ids: [],
        external_ids: [
          {
            system_code: "TEST_SYSTEM",
            external_id: `EXT-${index + 1}`,
          } satisfies IShoppingMallSkuExternalId.ICreate,
        ],
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
      return sku;
    },
  );

  // Sort local copy by created_at ascending to use as ground truth
  const ascByCreatedAt: IShoppingMallSku[] = [...createdSkus].sort((a, b) =>
    a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0,
  );

  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const pageSize = 5 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const requestAscPage1 = {
    page,
    pageSize,
    productId: undefined,
    status: undefined,
    statusList: undefined,
    inventoryStateCode: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    minInventoryQuantity: undefined,
    maxInventoryQuantity: undefined,
    lowStockOnly: undefined,
    includeDeleted: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    updatedFrom: undefined,
    updatedTo: undefined,
    sortField: "created_at",
    sortDirection: "asc",
  } satisfies IShoppingMallSku.IRequest;

  const page1Asc: IPageIShoppingMallSku.ISummary =
    await api.functional.shoppingMall.seller.products.skus.index(connection, {
      productId: product.id,
      body: requestAscPage1,
    });
  typia.assert<IPageIShoppingMallSku.ISummary>(page1Asc);

  TestValidator.equals(
    "page 1 pagination current",
    page1Asc.pagination.current,
    1 as number,
  );
  TestValidator.equals(
    "page 1 pagination limit",
    page1Asc.pagination.limit,
    pageSize,
  );
  TestValidator.equals("page 1 data length", page1Asc.data.length, pageSize);

  const requestAscPage2 = {
    ...requestAscPage1,
    page: 2 as number as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallSku.IRequest;

  const page2Asc: IPageIShoppingMallSku.ISummary =
    await api.functional.shoppingMall.seller.products.skus.index(connection, {
      productId: product.id,
      body: requestAscPage2,
    });
  typia.assert<IPageIShoppingMallSku.ISummary>(page2Asc);

  TestValidator.equals(
    "page 2 pagination current",
    page2Asc.pagination.current,
    2 as number,
  );
  TestValidator.equals(
    "page 2 data length",
    page2Asc.data.length,
    skuCount - pageSize,
  );

  const combinedAscSummaries = [...page1Asc.data, ...page2Asc.data];
  TestValidator.equals(
    "combined page1+page2 covers all unique SKUs",
    combinedAscSummaries.length,
    skuCount,
  );

  const combinedIds = combinedAscSummaries.map((s) => s.id);
  const uniqueIds = Array.from(new Set(combinedIds));
  TestValidator.equals(
    "no overlapping IDs between page1 and page2",
    uniqueIds.length,
    skuCount,
  );

  const expectedIdsAscOrder = ascByCreatedAt.map((s) => s.id);
  TestValidator.equals(
    "page1+page2 asc order matches local created_at asc order (by ids)",
    combinedIds,
    expectedIdsAscOrder,
  );

  const expectedRecords = skuCount as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  TestValidator.equals(
    "records count in page1 equals total created",
    page1Asc.pagination.records,
    expectedRecords,
  );
  TestValidator.equals(
    "records count in page2 equals total created",
    page2Asc.pagination.records,
    expectedRecords,
  );

  const expectedPages = Math.ceil(skuCount / pageSize);
  TestValidator.equals(
    "pages count in page1 matches math",
    page1Asc.pagination.pages,
    expectedPages,
  );
  TestValidator.equals(
    "pages count in page2 matches math",
    page2Asc.pagination.pages,
    expectedPages,
  );

  const requestDescPage1 = {
    ...requestAscPage1,
    sortDirection: "desc" as const,
  } satisfies IShoppingMallSku.IRequest;

  const page1Desc: IPageIShoppingMallSku.ISummary =
    await api.functional.shoppingMall.seller.products.skus.index(connection, {
      productId: product.id,
      body: requestDescPage1,
    });
  typia.assert<IPageIShoppingMallSku.ISummary>(page1Desc);

  TestValidator.equals(
    "desc page1 records equals asc page1 records",
    page1Desc.pagination.records,
    page1Asc.pagination.records,
  );
  TestValidator.equals(
    "desc page1 pages equals asc page1 pages",
    page1Desc.pagination.pages,
    page1Asc.pagination.pages,
  );
  TestValidator.equals(
    "desc page1 limit equals asc page1 limit",
    page1Desc.pagination.limit,
    page1Asc.pagination.limit,
  );

  const expectedDescFirstPageIds = [...expectedIdsAscOrder]
    .reverse()
    .slice(0, pageSize);
  const actualDescFirstPageIds = page1Desc.data.map((s) => s.id);
  TestValidator.equals(
    "desc first page ids are reverse of asc order's last segment",
    actualDescFirstPageIds,
    expectedDescFirstPageIds,
  );
}
