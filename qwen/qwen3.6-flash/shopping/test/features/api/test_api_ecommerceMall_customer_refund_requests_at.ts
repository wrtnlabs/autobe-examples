import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_customer_refund_requests_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallRefundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.at(connection, {
      requestId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
