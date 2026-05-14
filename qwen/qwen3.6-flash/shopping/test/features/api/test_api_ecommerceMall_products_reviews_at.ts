import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_products_reviews_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallReview =
    await api.functional.ecommerceMall.products.reviews.at(connection, {
      productId: typia.random<string & tags.Format<"uuid">>(),
      reviewId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
