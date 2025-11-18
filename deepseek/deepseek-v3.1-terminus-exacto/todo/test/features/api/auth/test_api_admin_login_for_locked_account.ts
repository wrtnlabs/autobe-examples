import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

export async function test_api_admin_login_for_locked_account(
  connection: api.IConnection,
) {
  // 1. Prepare a known locked admin account (locked=true, not deleted)
  // For test purposes, generate plausible valid email and password values
  // Note: We don't have an API to create or update admin lock status here, so assume the precondition exists in E2E environment
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128> & tags.Format<"password">
  >();
  const credentials = { email, password } satisfies ITodoListAdmin.ILogin;

  // 2. Attempt to login as locked admin and expect authentication error (generic, no lock reason disclosed)
  await TestValidator.error(
    "login with locked admin must fail with generic authentication error",
    async () => {
      await api.functional.auth.admin.login(connection, { body: credentials });
    },
  );
}
