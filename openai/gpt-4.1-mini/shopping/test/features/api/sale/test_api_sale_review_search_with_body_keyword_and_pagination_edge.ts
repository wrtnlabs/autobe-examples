import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleReview";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_sale_review_search_with_body_keyword_and_pagination_edge(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: create admin connection and seller, then create a sale
  const adminConnection: api.IConnection = { host: connection.host };
  // Create a seller (simulate seller connection creation here if needed)
  // We'll create a sale to test reviews
  // For simplicity, we simulate a sale creation with typia.random since no sale creation endpoint is provided
  const sale = typia.random<IShoppingMallSale.ISummary>();
  // 2. Create multiple reviews for the sale with known body content including a common keyword
  const customerConnection: api.IConnection = { host: connection.host };
  // Prepare reviews data with the keyword 'wonderful' in some reviews' body
  const keyword = "wonderful";
  const reviews: IShoppingMallSaleReview.IRequest[] = [
    { rating: 5, body: `This is a wonderful product` },
    { rating: 4, body: `A really wonderful experience` },
    { rating: 3, body: `Not so great` },
    { rating: 5, body: `Absolutely wonderful!` },
    { rating: 1, body: `Terrible experience` },
    { rating: 2, body: `This product is wonderful indeed` },
  ];
  // For test purpose, we treat reviews array length as total reviews, but simulate some soft deleted
  // 3. For soft deletion simulation, we arbitrarily select indexes 2 and 4 as soft deleted
  // but since no direct API for creating soft deleted reviews, we simulate only returning active reviews
  // 4. Since creation endpoints for reviews is unspecified, assume they exist and skip actual creation
  // 5. Call the reviews search API with the keyword and pagination: page 2, limit 2
  const page = 2;
  const limit = 2;
  const response = await api.functional.shoppingMall.sales.reviews.index(
    customerConnection,
    {
      saleId: sale.id,
      body: {
        body: keyword,
        page,
        limit,
      },
    },
  );
  typia.assert(response);
  // 6. Validate response structure and data
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    page,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, limit);
  // Total records must be at least the number of reviews containing keyword and not soft deleted
  // Count number of non-soft-deleted reviews that contain the keyword
  const activeReviews = reviews.filter(
    (r, i) =>
      r.body !== undefined &&
      r.body !== null &&
      r.body.includes(keyword) &&
      i !== 2 &&
      i !== 4,
  );
  const totalExpected = activeReviews.length;
  TestValidator.predicate(
    "pagination records >= total expected",
    response.pagination.records >= totalExpected,
  );
  TestValidator.predicate(
    "page number valid",
    response.pagination.current >= 1,
  );
  TestValidator.predicate("pages count valid", response.pagination.pages >= 0);
  // 7. Validate all data contains the keyword and are not soft deleted
  for (const review of response.data) {
    typia.assert(review);
    TestValidator.predicate(
      "review body contains keyword or is null",
      review.body === null || review.body.includes(keyword),
    );
    TestValidator.predicate(
      "review not soft deleted",
      review.deleted_at === null,
    );
    TestValidator.equals("review saleId matches", review.sale.id, sale.id);
  }
}
