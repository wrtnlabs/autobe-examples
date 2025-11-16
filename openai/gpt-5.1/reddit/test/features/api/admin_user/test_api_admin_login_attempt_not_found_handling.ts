import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformLoginAttempt";

/**
 * Validate not-found handling for admin login attempt detail retrieval.
 *
 * Business goal: Ensure that when an authenticated adminUser tries to fetch a
 * specific login attempt by id and that record does not exist, the system
 * responds with a failure (HttpError) instead of returning a fabricated or
 * misleading ICommunityPlatformLoginAttempt object.
 *
 * E2E limitations and adaptation of the scenario:
 *
 * - We cannot assert on concrete HTTP status codes (e.g., 404) or check for
 *   specific error codes like LOGIN_ATTEMPT_NOT_FOUND in the error body,
 *   because the E2E testing guidelines explicitly prohibit status-code-based
 *   and schema-specific error validation.
 * - We also cannot deliberately hit type-level validation (e.g., invalid UUID
 *   format) because tests must always pass correctly typed values.
 *
 * Therefore, the test focuses on two technical properties:
 *
 * 1. For a non-existent but well-formed loginAttemptId, the `loginAttempts.at`
 *    call must fail by throwing an HttpError instead of returning an
 *    ICommunityPlatformLoginAttempt.
 * 2. The call must remain read-only from the perspective of this test: we perform
 *    no writes around it, and a not-found error must not be accompanied by any
 *    create/update/delete side effects in this flow.
 *
 * Test steps:
 *
 * 1. Perform admin join via `api.functional.auth.adminUser.join` using a randomly
 *    generated, unique username and email. This both creates the adminUser and
 *    configures the connection with an Authorization header via the SDK’s
 *    built-in behavior.
 * 2. Generate a random UUID string to use as `loginAttemptId` in the subsequent
 *    GET call. Because we never create any login attempts in this test, the
 *    probability that this UUID corresponds to an existing record is
 *    negligible. We rely on business assumptions and isolation of test data to
 *    treat it as non-existent.
 * 3. Invoke `api.functional.communityPlatform.adminUser.loginAttempts.at` with the
 *    authenticated connection and the random `loginAttemptId`.
 * 4. Use `TestValidator.error` to assert that calling this endpoint with a
 *    non-existent id results in an error (HttpError thrown by the client)
 *    instead of a successful DTO response. We do not inspect the status code or
 *    message body; we only require that an error is thrown.
 * 5. There are no further side-effect checks, because the GET endpoint is
 *    documented as read-only and this test does not perform any writes around
 *    it. The absence of additional write calls in this scenario is enough to
 *    respect the read-only requirement in the scope of this E2E test.
 */
export async function test_api_admin_login_attempt_not_found_handling(
  connection: api.IConnection,
) {
  // 1. Create and authenticate an adminUser via join endpoint
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Generate a random UUID that should not correspond to any login attempt
  const nonexistentLoginAttemptId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Call the loginAttempts.at endpoint and assert it fails with an error
  await TestValidator.error(
    "non-existent admin login attempt must cause error",
    async () => {
      // This call is expected to throw an HttpError due to not-found
      await api.functional.communityPlatform.adminUser.loginAttempts.at(
        connection,
        {
          loginAttemptId: nonexistentLoginAttemptId,
        },
      );
    },
  );

  // 4. No further assertions: the absence of write calls around this GET
  //    operation, together with the error expectation, is sufficient for
  //    validating read-only, not-found behavior in this E2E scope.
}
