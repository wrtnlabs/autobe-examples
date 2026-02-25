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

export async function test_api_sale_review_search_with_rating_filter_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Prepare a customer connection (simulate customer actor)
  const customerConnection: api.IConnection = { host: connection.host };
  // Use a valid saleId for testing - generate a random uuid for saleId
  const saleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Define filtering criteria: minimum rating = 3, page = 1, limit = 3
  const body: IShoppingMallSaleReview.IRequest = {
    rating: 3,
    page: 1,
    limit: 3,
  };
  // Call the API endpoint
  const response = await api.functional.shoppingMall.sales.reviews.index(
    customerConnection,
    {
      saleId,
      body,
    },
  );
  // Validate the top-level response schema
  typia.assert(response);
  // Assert pagination fields are consistent
  await TestValidator.predicate(
    "pagination current page valid",
    response.pagination.current === 1,
  );
  await TestValidator.predicate(
    "pagination limit valid",
    response.pagination.limit === 3,
  );
  await TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  await TestValidator.predicate(
    "pagination pages consistent",
    response.pagination.pages ===
      (response.pagination.records === 0
        ? 0
        : Math.ceil(response.pagination.records / response.pagination.limit)),
  );
  // Validate each review record in the page
  for (const review of response.data) {
    // Each review is not soft-deleted
    await TestValidator.predicate(
      "review active (not soft deleted)",
      review.deleted_at === null,
    );
    // Validate the review structure as per IShoppingMallSaleReview.ISummary
    typia.assert(review);
    // Validate rating is at least the filtered minimum
    await TestValidator.predicate(
      "review rating >= filter",
      review.rating >= 3,
    );
    // Validate presence of created_at and updated_at timestamps
    await TestValidator.predicate(
      "review has created_at",
      typeof review.created_at === "string" && review.created_at.length > 0,
    );
    await TestValidator.predicate(
      "review has updated_at",
      typeof review.updated_at === "string" && review.updated_at.length > 0,
    );
    // Validate customer summary is defined and has id
    await TestValidator.predicate(
      "review has customer summary",
      review.customer !== undefined &&
        typeof review.customer.id === "string" &&
        review.customer.id.length > 0,
    );
    // Validate sale summary is defined and has id
    await TestValidator.predicate(
      "review has sale summary",
      review.sale !== undefined &&
        typeof review.sale.id === "string" &&
        review.sale.id.length > 0,
    );
  }
}
