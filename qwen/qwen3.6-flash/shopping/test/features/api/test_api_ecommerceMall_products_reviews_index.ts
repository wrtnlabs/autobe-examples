import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_products_reviews_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallReview.ISummary =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IEcommerceMallReview.IRequest>(),
    });
  typia.assert(output);
}
