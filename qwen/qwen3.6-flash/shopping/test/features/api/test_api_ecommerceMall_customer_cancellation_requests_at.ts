import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_customer_cancellation_requests_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallCancellationRequest =
    await api.functional.ecommerceMall.customer.cancellation_requests.at(
      connection,
      {
        requestId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
