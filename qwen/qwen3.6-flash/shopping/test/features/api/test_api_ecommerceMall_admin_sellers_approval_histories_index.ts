import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallSellerApprovalHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalHistory";
import { IPageIEcommerceMallSellerApprovalHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalHistory";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_admin_sellers_approval_histories_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallSellerApprovalHistory.ISummary =
    await api.functional.ecommerceMall.admin.sellers.approval_histories.index(
      connection,
      {
        sellerId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IEcommerceMallSellerApprovalHistory.IRequest>(),
      },
    );
  typia.assert(output);
}
