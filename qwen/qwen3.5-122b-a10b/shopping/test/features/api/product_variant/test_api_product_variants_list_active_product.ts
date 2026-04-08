import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that customers can browse all variants of an active product.
 *
 * Validates the product variants listing endpoint returns properly structured variant data with pagination metadata. Ensures each variant includes SKU codes, option values, pricing information, and stock counts calculated from inventory records. Each variant must reference the parent product summary for navigation.
 *
 * 1. Call variants listing endpoint with product ID and optional filters
 * 2. Validate response structure includes pagination metadata and variant data array
 * 3. Verify each variant contains required fields: id, sku_code, option_values, stock_count
 * 4. Confirm parent product reference exists in each variant
 * 5. Validate pagination metadata: current page, limit, total records, total pages
 */
export async function test_api_product_variants_list_active_product(
  connection: api.IConnection,
): Promise<void> {
  // Call variants listing endpoint with random product ID and default filters
  const output: IPageIEcommerceProductVariant.ISummary =
    await api.functional.ecommerce.products.variants.index(connection, {
      productId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 20 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        sort: "created_at",
        order: "desc" as const,
      } satisfies IEcommerceProductVariant.IRequest,
    });
  typia.assert(output);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "current page is non-negative",
    output.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is non-negative",
    output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "total records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    output.pagination.pages >= 0,
  );
  // Validate pages calculation: pages = ceil(records / limit) when limit > 0
  if (output.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      output.pagination.records / output.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation correct",
      output.pagination.pages,
      expectedPages,
    );
  }
  // Validate variant data structure if variants exist
  if (output.data.length > 0) {
    const variant = output.data[0];
    TestValidator.predicate(
      "variant has valid id",
      /^[0-9a-f-]{36}$/i.test(variant.id),
    );
    TestValidator.predicate(
      "variant has sku_code",
      variant.sku_code.length > 0,
    );
    TestValidator.predicate(
      "variant has option_values",
      variant.option_values.length > 0,
    );
    TestValidator.predicate(
      "variant stock_count is non-negative",
      variant.stock_count >= 0,
    );
    TestValidator.predicate(
      "variant has parent product",
      variant.product !== null && variant.product !== undefined,
    );
  }
}
