import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import typia from "typia";

export async function test_api_ecommerceMall_customer_refund_requests_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallRefundRequest.ISummary =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      connection,
      {
        body: typia.random<IEcommerceMallRefundRequest.IRequest>(),
      },
    );
  typia.assert(output);
}
