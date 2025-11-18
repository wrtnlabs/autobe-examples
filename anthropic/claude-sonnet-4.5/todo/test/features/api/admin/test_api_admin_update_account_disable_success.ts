import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test disabling an administrator account by setting the disabled_at timestamp.
 *
 * 1. Register a new admin account (generate unique email & password)
 * 2. Disable the admin using the update endpoint (set disabled_at to ISO string)
 * 3. Confirm the returned admin object has disabled_at set and is not null
 * 4. Attempt to authenticate with disabled admin - expect failure
 * 5. Validate all returned data and business rule enforcement
 */
export async function test_api_admin_update_account_disable_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin account
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email,
    password,
    href: "https://admin-audit.example.com/signup",
    referrer: "https://admin-audit.example.com/login",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoListAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(adminAuth);
  const adminId = typia.assert<string & tags.Format<"uuid">>(adminAuth.id);

  // 2. Disable the admin account (set disabled_at)
  const disabledAt = new Date().toISOString();
  const updateBody = {
    disabled_at: disabledAt,
  } satisfies ITodoListAdmin.IUpdate;
  const updatedAdmin = await api.functional.todoList.admin.admins.update(
    connection,
    {
      adminId,
      body: updateBody,
    },
  );
  typia.assert(updatedAdmin);
  TestValidator.equals(
    "admin is disabled",
    updatedAdmin.disabled_at,
    disabledAt,
  );

  // 3. Attempt to authenticate with the disabled admin account again and expect failure.
  await TestValidator.error(
    "authentication should fail for disabled admin",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email,
          password,
          href: "https://admin-audit.example.com/reauth",
          referrer: "https://admin-audit.example.com/login",
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies ITodoListAdmin.IJoin,
      });
    },
  );
}
