import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_admin_admins_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallAdmin =
    await api.functional.ecommerceMall.admin.admins.at(connection, {
      adminId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
