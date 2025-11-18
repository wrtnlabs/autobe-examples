import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";

/**
 * Attempts administrator registration using a password that violates the
 * password policy, expecting failure.
 *
 * 1. Generate a unique email and a password that does not meet password policy
 *    (e.g., too short like "123").
 * 2. Attempt registration via api.functional.auth.admin.join.
 * 3. Assert that registration fails with error.
 * 4. Optionally, if API ever allows success (compromised), validate user actually
 *    not created (would require listing/check, not supported in this simplified
 *    scenario).
 */
export async function test_api_admin_registration_password_policy_violation(
  connection: api.IConnection,
) {
  const invalidPassword = "123"; // intentionally too short or simple for policy
  const requestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: invalidPassword,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ITodoAppAdmin.IJoin;

  await TestValidator.error(
    "registration with policy-violating password should fail",
    async () => {
      await api.functional.auth.admin.join(connection, { body: requestBody });
    },
  );
}
