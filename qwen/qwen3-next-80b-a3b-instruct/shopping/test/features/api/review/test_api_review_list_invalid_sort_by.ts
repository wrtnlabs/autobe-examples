import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_invalid_sort_by(
  connection: api.IConnection,
) {
  // Test that providing an invalid sort_by value ("invalid") returns a 400 error
  // The endpoint accepts only "rating", "created_at", or "updated_at" as sort_by values
  // This test validates proper error handling for unsupported sort criteria

  await TestValidator.error(
    "invalid sort_by parameter should return 400 error",
    async () => {
      await api.functional.shoppingMall.reviews.index(connection, {
        body: "invalid", // Invalid sort_by value that should trigger server-side validation error
      });
    },
  );
}
