import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_invalid_integers(
  connection: api.IConnection,
) {
  // Test that invalid integer values in request body trigger 400 errors
  // The endpoint expects integer values for pagination parameters (current and limit)
  // Test with string values that cannot be parsed as integers
  await TestValidator.error(
    "invalid string value for current page should return 400 error",
    async () => {
      await api.functional.shoppingMall.reviews.index(connection, {
        body: "abc" satisfies IShoppingMallReview.IRequest,
      });
    },
  );

  // Test with another invalid string value that cannot be parsed as integer
  await TestValidator.error(
    "invalid string value for limit should return 400 error",
    async () => {
      await api.functional.shoppingMall.reviews.index(connection, {
        body: "xyz" satisfies IShoppingMallReview.IRequest,
      });
    },
  );

  // Test with mixed invalid string value including numbers and letters
  await TestValidator.error(
    "mixed invalid string value for request should return 400 error",
    async () => {
      await api.functional.shoppingMall.reviews.index(connection, {
        body: "123abc" satisfies IShoppingMallReview.IRequest,
      });
    },
  );
}
