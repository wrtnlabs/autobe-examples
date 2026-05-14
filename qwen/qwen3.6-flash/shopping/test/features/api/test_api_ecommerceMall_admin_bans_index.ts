import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IPageIEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUserBan";
import typia from "typia";

export async function test_api_ecommerceMall_admin_bans_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallUserBan.ISummary =
    await api.functional.ecommerceMall.admin.bans.index(connection, {
      body: typia.random<IEcommerceMallUserBan.IRequest>(),
    });
  typia.assert(output);
}
