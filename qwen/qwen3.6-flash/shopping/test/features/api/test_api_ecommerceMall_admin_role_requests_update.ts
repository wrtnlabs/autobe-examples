import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallAdminRoleRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRoleRequest";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_admin_role_requests_update(
  connection: api.IConnection,
) {
  const output: IEcommerceMallAdminRoleRequest =
    await api.functional.ecommerceMall.admin.role_requests.update(connection, {
      requestId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IEcommerceMallAdminRoleRequest.IUpdate>(),
    });
  typia.assert(output);
}
