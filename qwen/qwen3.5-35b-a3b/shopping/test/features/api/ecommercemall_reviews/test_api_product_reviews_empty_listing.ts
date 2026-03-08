import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving reviews for a product that has no reviews yet.
 * This scenario validates the edge case of an empty review list.
 *
 * Test Steps:
 * 1. Request reviews list for a product with no reviews
 * 2. Verify empty data array in response
 * 3. Validate pagination metadata shows zero records and zero pages
 * 4. Confirm no errors are thrown for valid empty state
 */
export async function test_api_product_reviews_empty_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a valid product UUID for testing
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Request reviews for the product (which may have no reviews)
  const reviewRequest: IEcommerceMallReview.IRequest = {
    productId: productId,
    page: 1,
    pageSize: 20,
  } satisfies IEcommerceMallReview.IRequest;
  const response = await api.functional.ecommerceMall.products.reviews.index(
    connection,
    {
      productId,
      body: reviewRequest,
    },
  );
  typia.assert(response);
  // 3. Verify empty data array
  TestValidator.equals("data array is empty", response.data.length, 0);
  // 4. Validate pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 20", response.pagination.limit, 20);
  TestValidator.equals("total records is 0", response.pagination.records, 0);
  TestValidator.equals("total pages is 0", response.pagination.pages, 0);
}
