import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test basic product search functionality to verify customers can discover products using keyword matching.
 *
 * Test Steps:
 * 1. Authenticate as customer using join endpoint
 * 2. Search for products using a partial product name keyword
 * 3. Verify response contains paginated results with pagination metadata (current page, limit, total records, total pages)
 * 4. Verify each product in results contains required summary fields: id, name, priceRangeMin, priceRangeMax, seller info (id, email, shopName, approvalStatus), category info (id, name, description, createdAt, parent), reviewCount, isAvailable flag
 * 5. Verify thumbnail image is included (IEcommerceMallProductImage.ISummary with id, imageUrl, displayOrder)
 * 6. Verify averageRating is present (number or null)
 * 7. Verify response respects default pagination (page 1, limit 20)
 *
 * Business Validations:
 * - Products have proper nested seller and category objects
 * - Price ranges are calculated from variants or base_price
 * - Ratings are aggregated from non-deleted reviews
 * - Deleted products are NOT included in results
 * - Products without variants show isAvailable=false
 */
export async function test_api_customer_product_search_keyword_discovery(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Search for products using a keyword
  const searchRequest = {
    name: "product",
    categoryId: null,
    minPrice: null,
    maxPrice: null,
    inStockOnly: null,
    sort: null,
    page: null,
    limit: null,
  } satisfies IEcommerceMallProduct.IRequest;
  const searchResult =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      { body: searchRequest },
    );
  // 3. Validate response structure with typia (validates all types including nested objects)
  typia.assert(searchResult);
  // 4. Validate pagination metadata business logic
  const pagination: IPage.IPagination = searchResult.pagination;
  TestValidator.predicate("current page is positive", pagination.current >= 1);
  TestValidator.predicate("limit is positive", pagination.limit > 0);
  TestValidator.predicate("records is non-negative", pagination.records >= 0);
  TestValidator.predicate("pages is non-negative", pagination.pages >= 0);
  // 5. Validate default pagination values
  TestValidator.equals("default page is 1", pagination.current, 1);
  TestValidator.equals("default limit is 20", pagination.limit, 20);
  // 6. Validate business logic for products if results exist
  if (searchResult.data.length > 0) {
    const firstProduct = searchResult.data[0];
    // Validate price range business logic (min should be <= max)
    TestValidator.predicate(
      "priceRangeMin <= priceRangeMax",
      firstProduct.priceRangeMin <= firstProduct.priceRangeMax,
    );
    // Validate reviewCount is non-negative
    TestValidator.predicate(
      "reviewCount is non-negative",
      firstProduct.reviewCount >= 0,
    );
    // Validate seller approval status is valid enum value
    const validApprovalStatuses = [
      "pending",
      "approved",
      "rejected",
      "suspended",
    ] as const;
    TestValidator.predicate(
      "seller approvalStatus is valid",
      validApprovalStatuses.includes(
        firstProduct.seller
          .approvalStatus as (typeof validApprovalStatuses)[number],
      ),
    );
    // Validate thumbnail display order is non-negative if thumbnail exists
    if (
      firstProduct.thumbnail !== null &&
      firstProduct.thumbnail !== undefined
    ) {
      TestValidator.predicate(
        "thumbnail displayOrder is non-negative",
        firstProduct.thumbnail.displayOrder >= 0,
      );
    }
    // Validate averageRating is within valid range (1-5) if present
    if (
      firstProduct.averageRating !== null &&
      firstProduct.averageRating !== undefined
    ) {
      TestValidator.predicate(
        "averageRating is between 1 and 5",
        firstProduct.averageRating >= 1 && firstProduct.averageRating <= 5,
      );
    }
  }
  // 7. Validate pagination consistency
  TestValidator.predicate(
    "data length does not exceed limit",
    searchResult.data.length <= pagination.limit,
  );
  // Calculate expected total pages
  const expectedPages =
    pagination.records === 0
      ? 0
      : Math.ceil(pagination.records / pagination.limit);
  TestValidator.equals(
    "pages matches calculated value",
    pagination.pages,
    expectedPages,
  );
}
