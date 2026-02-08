import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductReviewProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewProductReviewStatistic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_shopping_mall_product_review_statistics_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Use base connection to create per-user connection (no authorization needed here)
  const userConnection: api.IConnection = { host: connection.host };
  // Scenario 1: Retrieve aggregated review statistics successfully for a random productId
  // Since no create APIs are available, we test with a random UUID and typia.assert on the response
  {
    const productId = typia.random<string & tags.Format<"uuid">>();
    const statistics =
      await api.functional.shoppingMall.products.reviews.statistics.index(
        userConnection,
        { productId },
      );
    typia.assert(statistics);
  }
  // Scenario 2: Retrieve statistics for a non-existent productId, expect 404 error
  await TestValidator.httpError(
    "404 Not Found with non-existent productId",
    404,
    async () => {
      const fakeProductId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.shoppingMall.products.reviews.statistics.index(
        userConnection,
        {
          productId: fakeProductId,
        },
      );
    },
  );
}
