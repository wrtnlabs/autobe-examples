import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallAdminRoleRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRoleRequest";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_admin_roleRequests_decide(
  connection: api.IConnection,
) {
  const output: IEcommerceMallAdminRoleRequest =
    await api.functional.ecommerceMall.admin.roleRequests.decide(connection, {
      requestId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IEcommerceMallAdminRoleRequest.IDecide>(),
    });
  typia.assert(output);
}
