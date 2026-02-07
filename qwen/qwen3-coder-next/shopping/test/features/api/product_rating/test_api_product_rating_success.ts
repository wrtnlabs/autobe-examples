import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductReviewRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewRating";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_rating_success(
  connection: api.IConnection,
): Promise<void> {
  // This is a simple GET endpoint that retrieves pre-aggregated rating metrics.
  // Since no authentication/authorization is required (x-autobe-authorization-type and x-autobe-authorization-actor are both null),
  // and there are no complex dependencies or business logic to set up,
  // we just call the endpoint with a valid product ID and validate the response.
  const productId = typia.random<string & tags.Format<"uuid">>();
  const rating = await api.functional.shoppingMall.products.rating.at(
    connection,
    {
      productId: productId,
    },
  );
  typia.assert(rating);
}
