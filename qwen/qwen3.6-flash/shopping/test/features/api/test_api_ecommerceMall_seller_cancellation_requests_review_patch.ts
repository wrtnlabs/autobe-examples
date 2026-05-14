import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import typia from "typia";

export async function test_api_ecommerceMall_seller_cancellation_requests_review_patch(
  connection: api.IConnection,
) {
  const output: IEcommerceMallCancellationRequest =
    await api.functional.ecommerceMall.seller.cancellation_requests.review.patch(
      connection,
      {
        body: typia.random<IEcommerceMallCancellationRequest.IReview>(),
      },
    );
  typia.assert(output);
}
