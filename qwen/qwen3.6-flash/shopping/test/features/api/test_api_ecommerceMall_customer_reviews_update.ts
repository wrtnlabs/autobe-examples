import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_customer_reviews_update(
  connection: api.IConnection,
) {
  const output: IEcommerceMallReview =
    await api.functional.ecommerceMall.customer.reviews.update(connection, {
      reviewId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IEcommerceMallReview.IUpdate>(),
    });
  typia.assert(output);
}
