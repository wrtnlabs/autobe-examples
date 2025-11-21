import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_login_invalid_password(
  connection: api.IConnection,
) {
  const invalidLogin = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: "invalid_password_123",
  } satisfies IShoppingMallAdmin.IRequest;

  await TestValidator.error("invalid password should fail", async () => {
    await api.functional.auth.admin.login(connection, {
      body: invalidLogin,
    });
  });
}
