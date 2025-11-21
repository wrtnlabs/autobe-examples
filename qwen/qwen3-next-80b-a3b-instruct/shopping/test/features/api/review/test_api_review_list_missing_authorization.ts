import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_missing_authorization(
  connection: api.IConnection,
) {
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "missing Authorization header should return 401",
    async () => {
      const randomReview = typia.random<IPageIShoppingMallReview.ISummary>();
      const body = JSON.stringify(randomReview);
      await api.functional.shoppingMall.reviews.index(unauthConn, {
        body: body as IShoppingMallReview.IRequest,
      });
    },
  );
}
