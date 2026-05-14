import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_admin_users_ban(
  connection: api.IConnection,
) {
  const output = await api.functional.ecommerceMall.admin.users.ban(
    connection,
    {
      userId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IEcommerceMallCustomer.IBanRequest>(),
    },
  );
  typia.assert(output);
}
