import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_customer_order_items_cancellation_requests_create(
  connection: api.IConnection,
) {
  const output: IEcommerceMallCancellationRequest =
    await api.functional.ecommerceMall.customer.order_items.cancellation_requests.create(
      connection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IEcommerceMallCancellationRequest.ICreate>(),
      },
    );
  typia.assert(output);
}
