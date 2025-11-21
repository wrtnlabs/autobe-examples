import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_login_password_length_exceeded(
  connection: api.IConnection,
) {
  await TestValidator.error(
    "password length exceeded should fail",
    async () => {
      const longPassword = RandomGenerator.alphabets(256); // 256 characters exceeds the 255 limit
      await api.functional.auth.admin.login(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password_hash: longPassword,
        } satisfies IShoppingMallAdmin.IRequest,
      });
    },
  );
}
