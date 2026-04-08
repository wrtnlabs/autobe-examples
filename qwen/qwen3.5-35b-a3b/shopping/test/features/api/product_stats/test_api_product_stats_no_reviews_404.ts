import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_stats_no_reviews_404(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random product ID to simulate a product without reviews
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Test that stats endpoint returns 404 when no reviews exist for the product
  // This validates that statistics records are only created when reviews exist
  await TestValidator.httpError(
    "product stats should return 404 when no reviews exist",
    [404],
    async () => {
      const stats = await api.functional.ecommerceMall.products.stats.at(
        connection,
        { productId },
      );
      typia.assert(stats);
    },
  );
}
