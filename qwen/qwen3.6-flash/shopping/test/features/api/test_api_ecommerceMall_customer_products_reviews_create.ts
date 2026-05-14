import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_customer_products_reviews_create(
  connection: api.IConnection,
) {
  const output: IEcommerceMallReview =
    await api.functional.ecommerceMall.customer.products.reviews.create(
      connection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IEcommerceMallReview.ICreate>(),
      },
    );
  typia.assert(output);
}
