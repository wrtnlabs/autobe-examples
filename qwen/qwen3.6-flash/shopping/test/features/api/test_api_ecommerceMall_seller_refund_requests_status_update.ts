import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_seller_refund_requests_status_update(
  connection: api.IConnection,
) {
  const output: IEcommerceMallRefundRequest =
    await api.functional.ecommerceMall.seller.refund_requests.status.update(
      connection,
      {
        requestId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IEcommerceMallRefundRequest.IUpdate>(),
      },
    );
  typia.assert(output);
}
