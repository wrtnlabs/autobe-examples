import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import typia from "typia";

export async function test_api_ecommerceMall_customer_cancellation_requests_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallCancellationRequest.ISummary =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      connection,
      {
        body: typia.random<IEcommerceMallCancellationRequest.IRequest>(),
      },
    );
  typia.assert(output);
}
