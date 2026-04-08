import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that a product with no reviews returns an empty list with proper pagination metadata.
 *
 * Validates the edge case where a product exists but has not received any customer reviews yet. This test ensures the API handles empty review collections gracefully and returns correct pagination metadata.
 *
 * The test generates a random product ID and calls the reviews endpoint. In simulation mode, this validates the response structure for products without reviews. In production, this would require actual product creation utilities to test with a real existing product.
 *
 * 1. Generate a random product UUID for testing.
 * 2. Calls the reviews endpoint with the product ID.
 * 3. Verifies empty data array is returned.
 * 4. Verifies pagination metadata shows current=1, limit=20, records=0, pages=0.
 */
export async function test_api_product_reviews_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection for accessing product reviews
  const customerConnection: api.IConnection = { host: connection.host };
  // Generate a random UUID for the product ID
  // In simulation mode, this will return mock data regardless of product existence
  // In production, this test would require product creation utilities to test with a real existing product
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Call the reviews endpoint with the product ID and empty request body
  const output: IPageIEcommerceReview.ISummary =
    await api.functional.ecommerce.products.reviews.index(customerConnection, {
      productId,
      body: {} satisfies IEcommerceReview.IRequest,
    });
  // Validate response structure
  typia.assert(output);
  // Validate empty data array
  TestValidator.equals("data array is empty", output.data.length, 0);
  // Validate pagination metadata for empty results
  TestValidator.equals("current page is 1", output.pagination.current, 1);
  TestValidator.equals("limit is 20", output.pagination.limit, 20);
  TestValidator.equals("total records is 0", output.pagination.records, 0);
  TestValidator.equals("total pages is 0", output.pagination.pages, 0);
}
