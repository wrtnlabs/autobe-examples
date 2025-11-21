import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_zero_page(
  connection: api.IConnection,
) {
  await TestValidator.error("zero page number should fail", async () => {
    await api.functional.shoppingMall.reviews.index(connection, {
      body: JSON.stringify({
        current: 0,
        limit: 10,
      }),
    });
  });
}
