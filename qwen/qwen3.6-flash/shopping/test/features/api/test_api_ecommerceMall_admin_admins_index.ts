import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import typia from "typia";

export async function test_api_ecommerceMall_admin_admins_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallAdmin.ISummary =
    await api.functional.ecommerceMall.admin.admins.index(connection, {
      body: typia.random<IEcommerceMallAdmin.IRequest>(),
    });
  typia.assert(output);
}
