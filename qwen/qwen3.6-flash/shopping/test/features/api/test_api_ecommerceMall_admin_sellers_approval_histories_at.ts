import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallSellerApprovalHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalHistory";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_admin_sellers_approval_histories_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallSellerApprovalHistory =
    await api.functional.ecommerceMall.admin.sellers.approval_histories.at(
      connection,
      {
        sellerId: typia.random<string & tags.Format<"uuid">>(),
        historyId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
