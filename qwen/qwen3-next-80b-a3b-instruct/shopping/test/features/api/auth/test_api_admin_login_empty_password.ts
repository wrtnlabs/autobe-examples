import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_login_empty_password(
  connection: api.IConnection,
) {
  await TestValidator.error("empty password should fail", async () => {
    await api.functional.auth.admin.login(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: "",
      } satisfies IShoppingMallAdmin.IRequest,
    });
  });
}
