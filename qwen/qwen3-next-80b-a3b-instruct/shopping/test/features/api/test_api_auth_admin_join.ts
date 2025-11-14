import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_auth_admin_join(connection: api.IConnection) {
  const output: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: typia.random<IShoppingMallAdmin.ICreate>(),
    });
  typia.assert(output);
}
