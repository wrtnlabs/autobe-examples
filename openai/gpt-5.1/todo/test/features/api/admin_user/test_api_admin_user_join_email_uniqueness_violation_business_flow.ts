import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Validate business enforcement of email uniqueness for administrative users
 * during registration via POST /auth/adminUser/join.
 *
 * Business goal:
 *
 * - Ensure that when an admin account is registered with a given email, any
 *   subsequent attempt to register another admin with the same email is
 *   rejected at the business layer, reflecting the unique index on
 *   todo_app_adminusers.email.
 *
 * Constraints from the testing framework and SDK:
 *
 * - Only api.functional.auth.adminUser.join is available for this scenario.
 * - Must not perform type-error based tests; request payloads must always satisfy
 *   ITodoAppAdminUser.IJoin.
 * - Must not assert specific HTTP status codes; only the fact that an HttpError
 *   is thrown is checked.
 * - Must not touch connection.headers directly; the SDK manages tokens.
 *
 * High-level flow:
 *
 * 1. Prepare an ITodoAppAdminUser.IJoin payload with:
 *
 *    - Email: concrete email string (generated with typia.random and
 *         tags.Format<"email">).
 *    - Password: valid password string (RandomGenerator.alphaNumeric).
 *    - Display_name: a concrete non-null string for clarity.
 *    - Status: a simple string like "active".
 *    - Ip: a simple IP-like string (e.g., "127.0.0.1").
 *    - Href/referrer: URL strings generated via typia.random with
 *         tags.Format<"uri">.
 * 2. Call api.functional.auth.adminUser.join(connection, { body }) to create the
 *    first admin; assert the response with typia.assert to confirm it is a
 *    valid ITodoAppAdminUser.IAuthorized.
 * 3. Build a second ITodoAppAdminUser.IJoin payload, reusing the same email but
 *    possibly different display_name or status, to keep the test focused on
 *    email uniqueness.
 * 4. Use TestValidator.error with an async closure to assert that attempting the
 *    second join call results in an error, indicating rejection of the
 *    duplicate registration. We do not inspect status codes or error messages.
 * 5. Re-assert that the first authorized admin object still conforms to
 *    ITodoAppAdminUser.IAuthorized as a proxy that the original account remains
 *    valid.
 */
export async function test_api_admin_user_join_email_uniqueness_violation_business_flow(
  connection: api.IConnection,
) {
  // 1. Prepare first admin join payload with a unique email
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);

  const firstJoinBody = {
    email,
    password,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdminUser.IJoin;

  const firstAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: firstJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(firstAuthorized);

  // 2. Attempt second registration with the same email but different profile
  const secondPassword = RandomGenerator.alphaNumeric(18);
  const secondJoinBody = {
    email,
    password: secondPassword,
    display_name: `${RandomGenerator.name()}-duplicate`,
    status: "active",
    ip: "192.168.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdminUser.IJoin;

  await TestValidator.error(
    "duplicated admin email join must be rejected",
    async () => {
      await api.functional.auth.adminUser.join(connection, {
        body: secondJoinBody,
      });
    },
  );

  // 3. Re-assert the original authorized admin object still matches its schema
  typia.assert<ITodoAppAdminUser.IAuthorized>(firstAuthorized);
}
