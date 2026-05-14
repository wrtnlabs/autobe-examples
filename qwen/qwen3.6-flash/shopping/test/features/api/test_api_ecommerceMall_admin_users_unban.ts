import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_admin_users_unban(
  connection: api.IConnection,
) {
  const output: IEcommerceMallUserBan =
    await api.functional.ecommerceMall.admin.users.unban(connection, {
      userId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IEcommerceMallUserBan.IUnbanRequest>(),
    });
  typia.assert(output);
}
