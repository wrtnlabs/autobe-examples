import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import typia from "typia";

export async function test_api_ecommerceMall_customer_reviews_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallReview.ISummary =
    await api.functional.ecommerceMall.customer.reviews.index(connection, {
      body: typia.random<IEcommerceMallReview.IRequest>(),
    });
  typia.assert(output);
}
