import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallAdminRoleRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRoleRequest";
import typia from "typia";

export async function test_api_ecommerceMall_admin_role_requests_create(
  connection: api.IConnection,
) {
  const output: IEcommerceMallAdminRoleRequest =
    await api.functional.ecommerceMall.admin.role_requests.create(connection, {
      body: typia.random<IEcommerceMallAdminRoleRequest.ICreate>(),
    });
  typia.assert(output);
}
