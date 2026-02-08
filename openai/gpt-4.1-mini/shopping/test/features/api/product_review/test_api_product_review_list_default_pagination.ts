import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReview";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_review_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Construct the default request body for product reviews listing
  const body: IShoppingMallProductReview.IRequest = {};
  // Call productReviews.index API with base connection
  // Use a separate connection for this actor if authorization was needed (not specified here, so use base)
  const output: IPageIShoppingMallProductReview.ISummary =
    await api.functional.shoppingMall.productReviews.index(connection, {
      body,
    });
  // Assert the response structure is correct and valid
  typia.assert(output);
  const { pagination, data } = output;
  // Validate pagination fields for default pagination
  TestValidator.predicate(
    "pagination current page is at least 1",
    pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination pages is zero if records zero",
    (pagination.records === 0) === (pagination.pages === 0),
  );
  TestValidator.predicate(
    "pagination pages is calculated correctly",
    pagination.pages ===
      (pagination.records === 0
        ? 0
        : Math.ceil(pagination.records / pagination.limit)),
  );
  // Check that data array length is not greater than pagination.limit
  TestValidator.predicate(
    "data length is within pagination limit",
    data.length <= pagination.limit,
  );
}
