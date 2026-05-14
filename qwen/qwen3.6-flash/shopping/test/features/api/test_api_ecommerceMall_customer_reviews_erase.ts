import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_customer_reviews_erase(
  connection: api.IConnection,
) {
  const output = await api.functional.ecommerceMall.customer.reviews.erase(
    connection,
    {
      reviewId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
