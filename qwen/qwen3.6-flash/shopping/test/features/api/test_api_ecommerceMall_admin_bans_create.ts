import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import typia from "typia";

export async function test_api_ecommerceMall_admin_bans_create(
  connection: api.IConnection,
) {
  const output: IEcommerceMallUserBan =
    await api.functional.ecommerceMall.admin.bans.create(connection, {
      body: typia.random<IEcommerceMallUserBan.ICreate>(),
    });
  typia.assert(output);
}
