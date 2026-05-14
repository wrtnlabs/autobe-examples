import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfSeller";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_admin_bans_seller_mapping_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallUserBanOfSeller =
    await api.functional.ecommerceMall.admin.bans.seller_mapping.at(
      connection,
      {
        banId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
