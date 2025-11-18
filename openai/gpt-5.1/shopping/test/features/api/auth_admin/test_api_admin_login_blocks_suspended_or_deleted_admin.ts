import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";

/**
 * Validate administrator login success and failure paths.
 *
 * Business intent: This test ensures that the `POST /auth/admin/login` endpoint
 * correctly authenticates shopping mall administrators created via `POST
 * /auth/admin/join` and that it properly rejects invalid credential attempts
 * using the same email. While the original scenario mentions suspended or
 * soft-deleted lifecycle states, the provided SDK does not expose status- or
 * deletion- mutating operations or direct DB access helpers. Therefore, this
 * test focuses on two critical behaviors that underpin those lifecycle checks:
 *
 * 1. A freshly joined admin with valid credentials can successfully log in from a
 *    clean, unauthenticated connection and receives a
 *    `IShoppingMallAdmin.IAuthorized` payload with a usable token.
 * 2. A subsequent login attempt using the same email but an incorrect password
 *    fails, demonstrating that the endpoint enforces credential checks and
 *    surfaces an error path that would also be used when the account is in an
 *    ineligible lifecycle state (e.g., suspended or soft-deleted).
 *
 * Step-by-step process:
 *
 * 1. Generate a random but valid admin join payload
 *    (`IShoppingMallAdminJoin.ICreate`), including email, password, href, and
 *    referrer.
 * 2. Call `api.functional.auth.admin.join` with the join payload on the provided
 *    `connection`, and validate the `IShoppingMallAdmin.IAuthorized` response
 *    with `typia.assert`.
 * 3. Capture the email and password used for join so they can be reused in the
 *    login payload.
 * 4. Construct a fresh `api.IConnection` instance (`unauthenticated`) by cloning
 *    the original connection but setting `headers: {}`. This avoids reusing the
 *    Authorization header that `join` adds and accurately simulates a new
 *    client attempting to log in.
 * 5. Build a valid `IShoppingMallAdminLogin.ICreate` payload using the joined
 *    email and password, along with realistic `href` and `referrer` values.
 * 6. Call `api.functional.auth.admin.login` on the unauthenticated connection with
 *    the correct credentials, assert the `IShoppingMallAdmin.IAuthorized`
 *    response via `typia.assert`, and validate that the email in the payload
 *    matches the joined email.
 * 7. Using `TestValidator.error`, perform a second login attempt on the
 *    unauthenticated connection with the same email but a clearly wrong
 *    password, verifying that the login endpoint rejects invalid credentials
 *    while preserving type safety (no type-error tests).
 */
export async function test_api_admin_login_blocks_suspended_or_deleted_admin(
  connection: api.IConnection,
) {
  // 1. Prepare a random but valid admin registration payload
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  // 2. Register the admin via POST /auth/admin/join
  const joined = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(joined);

  // Basic sanity checks on lifecycle-related fields
  TestValidator.predicate(
    "joined admin email matches join payload",
    joined.email === joinBody.email,
  );
  TestValidator.predicate(
    "joined admin deleted_at is null for active account",
    joined.deleted_at === null,
  );

  // 3. Prepare an independent unauthenticated connection
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Build a login payload using the same credentials
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  // 5. Successful login with correct credentials
  const loggedIn = await api.functional.auth.admin.login(unauthenticated, {
    body: loginBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(loggedIn);

  TestValidator.equals(
    "logged-in admin email should equal joined email",
    loggedIn.email,
    joinBody.email,
  );

  // 6. Failed login attempt with wrong password (same email)
  const wrongLoginBody = {
    email: joinBody.email,
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  // Ensure we actually changed the password to avoid a flakily equal value
  TestValidator.predicate(
    "wrongLoginBody password differs from original password",
    wrongLoginBody.password !== joinBody.password,
  );

  await TestValidator.error(
    "admin login with wrong password must fail",
    async () => {
      await api.functional.auth.admin.login(unauthenticated, {
        body: wrongLoginBody,
      });
    },
  );
}
