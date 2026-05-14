import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import typia from "typia";

export async function test_api_ecommerceMall_auth_admin_join(
  connection: api.IConnection,
) {
  const output: IEcommerceMallAdmin.IAuthorized =
    await api.functional.ecommerceMall.auth.admin.join(connection, {
      body: typia.random<IEcommerceMallAdmin.IJoin>(),
    });
  typia.assert(output);
}
