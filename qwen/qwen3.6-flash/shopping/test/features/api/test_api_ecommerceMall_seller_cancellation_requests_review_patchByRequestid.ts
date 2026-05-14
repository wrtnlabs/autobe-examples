import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_seller_cancellation_requests_review_patchByRequestid(
  connection: api.IConnection,
) {
  const output: IEcommerceMallCancellationRequest =
    await api.functional.ecommerceMall.seller.cancellation_requests.review.patchByRequestid(
      connection,
      {
        requestId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IEcommerceMallCancellationRequest.IReview>(),
      },
    );
  typia.assert(output);
}
