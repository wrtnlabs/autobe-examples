import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallAdminRoleRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRoleRequest";
import { IPageIEcommerceMallAdminRoleRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRoleRequest";
import typia from "typia";

export async function test_api_ecommerceMall_admin_roleRequests_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallAdminRoleRequest.ISummary =
    await api.functional.ecommerceMall.admin.roleRequests.index(connection, {
      body: typia.random<IEcommerceMallAdminRoleRequest.IRequest>(),
    });
  typia.assert(output);
}
