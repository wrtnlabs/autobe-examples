import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminSession";
import { IPageIEcommerceMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminSession";
import typia from "typia";

export async function test_api_ecommerceMall_admin_snapshots_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallAdminSession.ISummary =
    await api.functional.ecommerceMall.admin.snapshots.index(connection, {
      body: typia.random<IEcommerceMallAdminSession.IRequest>(),
    });
  typia.assert(output);
}
