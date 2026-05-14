import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_admin_sellers_approvals_update(
  connection: api.IConnection,
) {
  const output: IEcommerceMallSeller =
    await api.functional.ecommerceMall.admin.sellers.approvals.update(
      connection,
      {
        sellerId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IEcommerceMallSeller.IUpdate>(),
      },
    );
  typia.assert(output);
}
