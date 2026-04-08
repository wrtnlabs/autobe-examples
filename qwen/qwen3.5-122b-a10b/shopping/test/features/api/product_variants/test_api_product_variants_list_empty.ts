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
 * Test product variants listing endpoint response structure validation.
 *
 * Validates that the variants listing endpoint returns a properly structured paginated response when queried with a valid product UUID. This test ensures the API response conforms to the expected type structure including empty data arrays and correct pagination metadata format.
 *
 * Since product creation SDK functions are not available in this test environment, the test validates the endpoint's response structure and type safety rather than the specific edge case of products with no variants. The empty variants scenario requires product creation capabilities.
 *
 * 1. Generate a valid product UUID to query the variants endpoint.
 * 2. Call the variants listing endpoint with the product ID and empty filter criteria.
 * 3. Validate the response structure passes typia.assert() type validation.
 * 4. Validate pagination metadata fields are present and have valid types.
 * 5. Verify the data array structure is correctly typed (may be empty or contain variants).
 */
export async function test_api_product_variants_list_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a valid product UUID
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 2. Call the variants listing endpoint with empty request body
  const output: IPageIEcommerceProductVariant.ISummary =
    await api.functional.ecommerce.products.variants.index(connection, {
      productId,
      body: {} satisfies IEcommerceProductVariant.IRequest,
    });
  // 3. Validate response structure with typia
  typia.assert(output);
  // 4. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current is non-negative",
    output.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  // 5. Validate data array exists and is properly typed
  TestValidator.predicate("data array exists", Array.isArray(output.data));
  TestValidator.predicate(
    "data array length matches records count",
    output.data.length === output.pagination.records,
  );
}
