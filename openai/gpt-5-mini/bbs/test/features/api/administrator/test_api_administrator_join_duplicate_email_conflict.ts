import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

/**
 * Validate administrator registration uniqueness (email and username)
 * enforcement.
 *
 * Business context:
 *
 * - Administrator accounts must be unique by email and username. Duplicate
 *   registration attempts should be rejected by the server.
 *
 * Test steps:
 *
 * 1. Register a baseline administrator with a known email and username.
 * 2. Assert the registration succeeded and returned an authorization payload.
 * 3. Attempt to register again with the same email but a different username and
 *    assert the operation fails (duplicate email enforcement).
 * 4. Optionally, attempt to register with the same username but different email
 *    and assert failure (duplicate username enforcement).
 *
 * Notes:
 *
 * - This test uses only the provided SDK operation and DTOs. There is no direct
 *   SDK function to query DB row counts; so DB-level assertions are noted as
 *   comments where relevant for environments that provide DB access in the test
 *   harness.
 */
export async function test_api_administrator_join_duplicate_email_conflict(
  connection: api.IConnection,
) {
  // 1) Baseline administrator registration
  const baselineEmail = "admin+dup@example.com";
  const baselineUsername = "admin_dup";
  const baselinePassword = "StrongPass1!"; // >= 10 chars as required

  const created: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: baselineEmail,
        password: baselinePassword,
        username: baselineUsername,
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  // Validate the successful authorized response
  typia.assert(created);

  // Basic business assertions
  TestValidator.predicate(
    "created response contains token",
    typeof created.token?.access === "string" &&
      created.token?.access.length > 0,
  );

  // If user summary is returned, ensure username matches (business expectation)
  if (created.user !== undefined && created.user !== null) {
    TestValidator.equals(
      "created username matches",
      created.user.username,
      baselineUsername,
    );
  }

  // 2) Prepare an unauthenticated connection copy to re-attempt join
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3) Attempt duplicate registration with the same email but different username
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.administrator.join(unauthConn, {
        body: {
          email: baselineEmail, // same email
          password: baselinePassword,
          username: RandomGenerator.name(1), // different username
        } satisfies IEconPoliticalForumAdministrator.IJoin,
      });
    },
  );

  // 4) Optional: Attempt duplicate registration with same username but different email
  await TestValidator.error(
    "duplicate username registration should fail",
    async () => {
      await api.functional.auth.administrator.join(unauthConn, {
        body: {
          email: typia.random<string & tags.Format<"email">>(), // different valid email
          password: baselinePassword,
          username: baselineUsername, // same username
        } satisfies IEconPoliticalForumAdministrator.IJoin,
      });
    },
  );

  // Teardown note: If the test environment supports direct DB cleanup, remove
  // the created administrator record here (e.g., test DB rollback or delete by
  // ID). The SDK does not expose a delete admin endpoint in the provided
  // materials, so cleanup must be performed by the harness or DB transaction.
}
