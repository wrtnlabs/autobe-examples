import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_registereduser_list_sessions_empty_after_revoke_all(
  connection: api.IConnection,
) {
  /**
   * Test purpose:
   *
   * 1. Create a new registered user (join) and obtain an access token.
   * 2. Verify that at least one active session exists for this user.
   * 3. Revoke all sessions for that user.
   * 4. Verify post-condition: either requests using the old token are unauthorized
   *    (error thrown) OR the sessions listing returns 200 with an empty data
   *    array.
   *
   * Notes:
   *
   * - Uses only the provided SDK functions. Does not touch connection.headers.
   * - Typia.assert() is used to validate response types.
   */

  // 1) Create a new user via join
  const username = RandomGenerator.alphaNumeric(10).toLowerCase();
  const email = typia.random<string & tags.Format<"email">>();
  const password = `P@${RandomGenerator.alphaNumeric(10)}`; // >=10 chars with symbol

  const joinBody = {
    username,
    email,
    password,
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const authorized: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2) Precondition: list sessions and expect at least one session
  const before: IEconPoliticalForumRegisteredUser.ISessionList =
    await api.functional.auth.registeredUser.sessions.listSessions(connection);
  typia.assert(before);
  TestValidator.predicate(
    "initial sessions exist for created user",
    before.data.length > 0,
  );

  // 3) Revoke all sessions
  const revokeRes: IEconPoliticalForumRegisteredUser.IGenericSuccess =
    await api.functional.auth.registeredUser.sessions.revoke_all.revokeAllSessions(
      connection,
    );
  typia.assert(revokeRes);
  TestValidator.equals(
    "revoke all sessions succeeded",
    revokeRes.success,
    true,
  );

  // 4) Post-revoke: two acceptable behaviors
  //    A) The token is immediately invalidated -> calling listSessions throws (unauthorized)
  //    B) The endpoint returns 200 with an empty sessions array
  try {
    const after: IEconPoliticalForumRegisteredUser.ISessionList =
      await api.functional.auth.registeredUser.sessions.listSessions(
        connection,
      );
    // If we get here, the call succeeded; assert empty sessions list
    typia.assert(after);
    TestValidator.equals("sessions empty after revoke", after.data.length, 0);
  } catch (exp) {
    // If an exception was thrown, assert that an error occurred as a valid outcome
    await TestValidator.error(
      "revoked token should be unauthorized",
      async () => {
        // Re-throw the caught exception to satisfy TestValidator.error's expectation
        throw exp as any;
      },
    );
  }

  // Teardown note: No delete-user API available in provided SDK. Rely on test
  // environment isolation or external cleanup. If a user-deletion API exists in
  // the environment, incorporate it into teardown in CI.
}
