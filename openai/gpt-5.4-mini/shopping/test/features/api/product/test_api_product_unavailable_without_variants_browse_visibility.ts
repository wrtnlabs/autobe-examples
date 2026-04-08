import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_unavailable_without_variants_browse_visibility(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies browse visibility and pagination behavior for products with and without purchasable variants.
   *
   * This test focuses on the public catalog browsing contract exposed by the product list endpoint. It validates that the response is paginated, that browse results can be inspected through the summary shape, and that stock-filtered browsing remains consistent with the availability fields returned in the summaries.
   *
   * 1. Request a paginated product browse result without stock filtering.
   * 2. Confirm the response includes pagination metadata and product summaries.
   * 3. Request the same browse endpoint with in-stock-only filtering enabled.
   * 4. Confirm pagination remains valid and every returned product is reported as having at least one available variant.
   */
  const page = await api.functional.mallPlatform.products.index(connection, {
    body: {
      page: 1,
      limit: 20,
      sort: "newest",
    } satisfies IMallPlatformProduct.IRequest,
  });
  typia.assert(page);
  TestValidator.equals("browse page number", page.pagination.current, 1);
  TestValidator.equals("browse page size", page.pagination.limit, 20);
  TestValidator.predicate(
    "browse pagination metadata is valid",
    page.pagination.pages >= 0 && page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "browse returns summary records",
    page.data.every((product) => product.availableVariantCount >= 0),
  );
  const stockOnly = await api.functional.mallPlatform.products.index(
    connection,
    {
      body: {
        inStockOnly: true,
        page: 1,
        limit: 20,
        sort: "newest",
      } satisfies IMallPlatformProduct.IRequest,
    },
  );
  typia.assert(stockOnly);
  TestValidator.equals(
    "stock-only page number",
    stockOnly.pagination.current,
    1,
  );
  TestValidator.equals("stock-only page size", stockOnly.pagination.limit, 20);
  TestValidator.predicate(
    "stock-only pagination metadata is valid",
    stockOnly.pagination.pages >= 0 && stockOnly.pagination.records >= 0,
  );
  TestValidator.predicate(
    "stock-only browse only returns purchasable products",
    stockOnly.data.every((product) => product.availableVariantCount > 0),
  );
}
