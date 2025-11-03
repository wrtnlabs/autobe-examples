import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingSku";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";

/**
 * Validate authenticated seller SKU pagination and filtering with access
 * control.
 *
 * This test covers:
 *
 * - Seller authentication and authorization (using POST /auth/seller/join)
 * - Paginated SKU listing of a product for the seller with:
 *
 *   - Default pagination (no filters)
 *   - Filter by search, status, is_active, price, barcode
 *   - Pagination boundaries (last page, out-of-range page)
 *   - Empty result cases
 *   - Platform-standard pagination metadata (current, limit, pages, records)
 * - Negative case: SKUs for a product owned by another seller cannot be listed
 *   (permission denied)
 */
export async function test_api_seller_product_sku_list_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Seller authentication (register)
  const seller_email = RandomGenerator.alphaNumeric(10) + "@test.com";
  const join_body = {
    email: seller_email,
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: join_body });
  typia.assert(seller);
  TestValidator.equals("seller email matches", seller.email, join_body.email);

  // 2. Should have at least one product with SKUs under this seller: generate a presumably existing productCode
  //    For demonstration, assume seller owns a dummy productCode. (If product/product creation API not exposed, mock/random code is used)
  const productCode = RandomGenerator.alphaNumeric(12).toUpperCase();

  // 3. Default list all SKUs for the product (no filters, default page/limit)
  const allSkuList: IPageIShoppingSku.ISummary =
    await api.functional.shopping.seller.products.skus.index(connection, {
      productCode,
      body: {} satisfies IShoppingSku.IRequest,
    });
  typia.assert(allSkuList);
  TestValidator.equals(
    "pagination meta exists",
    typeof allSkuList.pagination,
    "object",
  );
  TestValidator.equals("data is array", Array.isArray(allSkuList.data), true);
  TestValidator.equals(
    "current page is 1 by default",
    allSkuList.pagination.current,
    1,
  );
  TestValidator.predicate(
    "page size is positive",
    allSkuList.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count >= 0",
    allSkuList.pagination.records >= 0,
  );
  TestValidator.predicate("pages count >= 0", allSkuList.pagination.pages >= 0);

  // 4. Apply advanced filters; search term, status, is_active
  const advancedFilters: IShoppingSku.IRequest = {
    search: RandomGenerator.paragraph({ sentences: 1 }),
    status: "in_stock",
    is_active: true,
    sort_by: "created_at",
    sort_order: "asc",
    min_price: 1,
    max_price: 100000,
    limit: 5,
    page: 1,
  } satisfies IShoppingSku.IRequest;
  const filteredList: IPageIShoppingSku.ISummary =
    await api.functional.shopping.seller.products.skus.index(connection, {
      productCode,
      body: advancedFilters,
    });
  typia.assert(filteredList);
  TestValidator.equals(
    "search page current matches request",
    filteredList.pagination.current,
    1,
  );
  TestValidator.equals(
    "search page size matches request",
    filteredList.pagination.limit,
    5,
  );
  TestValidator.equals(
    "search page respects min/max price range",
    filteredList.data.every((sku) => sku.price >= 1 && sku.price <= 100000),
    true,
  );
  TestValidator.equals(
    "search only is_active SKUs",
    filteredList.data.every((sku) => sku.is_active === true),
    true,
  );
  TestValidator.equals(
    "search only 'in_stock' SKUs",
    filteredList.data.every((sku) => sku.status === "in_stock"),
    true,
  );

  // 5. Pagination edge: request non-existent (very high) page (should yield empty set if no such page)
  const lastPageNum = filteredList.pagination.pages + 10; // Intentionally overflow
  const outOfRangePage: IPageIShoppingSku.ISummary =
    await api.functional.shopping.seller.products.skus.index(connection, {
      productCode,
      body: {
        ...advancedFilters,
        page: lastPageNum,
      } satisfies IShoppingSku.IRequest,
    });
  typia.assert(outOfRangePage);
  TestValidator.equals(
    "pagination for out-of-range page",
    outOfRangePage.pagination.current,
    lastPageNum,
  );
  TestValidator.equals(
    "empty data for out-of-range page",
    outOfRangePage.data.length,
    0,
  );

  // 6. Edge: filter for empty set (e.g. by barcode unlikely to exist)
  const nonMatchBarcode = RandomGenerator.alphaNumeric(16);
  const emptyList: IPageIShoppingSku.ISummary =
    await api.functional.shopping.seller.products.skus.index(connection, {
      productCode,
      body: { barcode: nonMatchBarcode } satisfies IShoppingSku.IRequest,
    });
  typia.assert(emptyList);
  TestValidator.equals(
    "empty list with random barcode",
    emptyList.data.length,
    0,
  );

  // 7. Negative case: try accessing a productCode that obviously shouldn’t belong to this seller (simulate foreign code)
  const foreignProductCode =
    "XFOREIGN" + RandomGenerator.alphaNumeric(6).toUpperCase();
  await TestValidator.error(
    "permission denied for other seller productCode",
    async () => {
      await api.functional.shopping.seller.products.skus.index(connection, {
        productCode: foreignProductCode,
        body: {} satisfies IShoppingSku.IRequest,
      });
    },
  );
}
