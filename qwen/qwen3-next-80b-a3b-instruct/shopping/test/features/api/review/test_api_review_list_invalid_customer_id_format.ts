import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_invalid_customer_id_format(
  connection: api.IConnection,
) {
  await TestValidator.error(
    "invalid customer_id UUID format should return 400 error",
    async () => {
      await api.functional.shoppingMall.reviews.index(connection, {
        body: "not-a-uuid",
      });
    },
  );
}
