import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfCustomer";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_admin_bans_customer_mapping_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallUserBanOfCustomer =
    await api.functional.ecommerceMall.admin.bans.customer_mapping.at(
      connection,
      {
        banId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
