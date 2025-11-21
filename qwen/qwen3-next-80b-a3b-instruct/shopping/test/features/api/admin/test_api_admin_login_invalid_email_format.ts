import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_login_invalid_email_format(
  connection: api.IConnection,
) {
  await TestValidator.error("invalid email format should fail", async () => {
    await api.functional.auth.admin.login(connection, {
      body: {
        email: "admin@", // Invalid email format - missing domain
        password_hash: "validPassword123",
      } satisfies IShoppingMallAdmin.IRequest,
    });
  });
}
