import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_customer_order_items_refund_requests_create(
  connection: api.IConnection,
) {
  const output: IEcommerceMallRefundRequest =
    await api.functional.ecommerceMall.customer.order_items.refund_requests.create(
      connection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IEcommerceMallRefundRequest.ICreate>(),
      },
    );
  typia.assert(output);
}
