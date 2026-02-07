import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallReviewSnapshotAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshotAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_reviews_analytics_basic_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random product ID for testing
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve product review analytics
  const analytics =
    await api.functional.shoppingMall.products.reviews.analytics.reviewsAnalytics(
      connection,
      {
        productId,
      },
    );
  // Validate the response structure and types
  typia.assert<IShoppingMallReviewSnapshotAnalytic>(analytics);
}
