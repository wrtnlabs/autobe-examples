import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

/**
 * E2E: Enable two-factor authentication (MFA/TOTP) for a newly created
 * todoUser.
 *
 * Steps:
 *
 * 1. Create a new todoUser via POST /auth/todoUser/join and capture the authorized
 *    response (id and token).
 * 2. Call POST /auth/todoUser/mfa/enable with provisioningMethod 'totp' to
 *    provision MFA for the authenticated user.
 * 3. Assert that the enable call returns a valid ISummary response and that the
 *    returned id matches the created user's id. Also assert that updatedAt on
 *    the summary is equal or later than the join response's updatedAt to
 *    indicate a modification.
 *
 * Notes:
 *
 * - The SDK's join function sets Authorization header internally; do NOT access
 *   or modify connection.headers in the test.
 * - The original scenario requested an explicit profile GET to verify
 *   `mfa_enabled`, but no such SDK function is available. This test adapts by
 *   validating the operations and timestamps available through the provided SDK
 *   functions.
 */
export async function test_api_todouser_enable_two_factor_success(
  connection: api.IConnection,
) {
  // 1) Create a fresh todoUser via join
  const email: string = typia.random<string & tags.Format<"email">>();
  const password = "Password123!"; // satisfies MinLength<8>

  const joinBody = {
    email,
    password,
    href: "http://localhost/signup",
    referrer: "http://localhost/",
    displayName: RandomGenerator.name(),
  } satisfies ITodoAppTodoUser.ICreate;

  const authorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, { body: joinBody });
  typia.assert(authorized);

  // Sanity: ensure an access token was returned
  TestValidator.predicate(
    "join returned access token",
    typeof authorized.token?.access === "string" &&
      authorized.token.access.length > 0,
  );

  // 2) Enable MFA (TOTP provisioning) using exact const value 'totp'
  const enableBody = {
    provisioningMethod: "totp",
    deviceName: RandomGenerator.name(),
    requireVerification: true,
  } satisfies ITodoAppTodoUser.IEnableMfa;

  const summary: ITodoAppTodoUser.ISummary =
    await api.functional.auth.todoUser.mfa.enable.enableTwoFactor(connection, {
      body: enableBody,
    });
  typia.assert(summary);

  // 3) Validate results: returned summary belongs to the same user and updatedAt has advanced (or equal)
  TestValidator.equals(
    "enableTwoFactor returned same user id",
    summary.id,
    authorized.id,
  );

  const createdUpdatedAt = new Date(authorized.updatedAt).getTime();
  const summaryUpdatedAt = new Date(summary.updatedAt).getTime();
  TestValidator.predicate(
    "enableTwoFactor updatedAt is same or later than join.updatedAt",
    summaryUpdatedAt >= createdUpdatedAt,
  );
}
