import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_auth_admin_refresh(connection: api.IConnection) {
  const output: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: typia.random<IShoppingMallAdmin.IRefresh>(),
    });
  typia.assert(output);
}
