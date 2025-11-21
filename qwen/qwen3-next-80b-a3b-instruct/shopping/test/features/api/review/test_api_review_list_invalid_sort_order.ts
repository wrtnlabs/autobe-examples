import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_invalid_sort_order(
  connection: api.IConnection,
) {
  await TestValidator.error(
    "invalid sort_order 'reverse' should fail",
    async () => {
      await api.functional.shoppingMall.reviews.index(connection, {
        body: '{"sort_order": "reverse"}',
      });
    },
  );
}
