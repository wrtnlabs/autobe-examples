import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_admin_bans_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallUserBan =
    await api.functional.ecommerceMall.admin.bans.at(connection, {
      banId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
