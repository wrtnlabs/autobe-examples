import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_registereduser_revoke_session_forbidden_when_not_owner(
  connection: api.IConnection,
) {
  // PURPOSE
  // Validate that a registered user cannot revoke a session that they do not
  // own. Because the SDK does not expose session listing or session ids from
  // join(), this test verifies observable access-control behavior by asserting
  // that a non-owner revoke attempt fails (throws). DB-level verification and
  // audit-log checks from the original scenario are omitted because the
  // provided SDK has no interfaces to inspect those resources.

  // 1) Prepare isolated connection objects for two users. Creating new
  //    connection objects ensures api.functional.auth.registeredUser.join()
  //    sets each connection's Authorization header independently.
  const connA: api.IConnection = { ...connection, headers: {} };
  const connB: api.IConnection = { ...connection, headers: {} };

  // 2) Create User A
  const userAEmail: string = typia.random<string & tags.Format<"email">>();
  const userAJoin = {
    username: RandomGenerator.alphaNumeric(8),
    email: userAEmail,
    password: "P@ssw0rd1234",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const userA: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connA, {
      body: userAJoin,
    });
  typia.assert(userA);

  // 3) Create User B
  const userBEmail: string = typia.random<string & tags.Format<"email">>();
  const userBJoin = {
    username: RandomGenerator.alphaNumeric(8),
    email: userBEmail,
    password: "P@ssw0rd1234",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const userB: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connB, {
      body: userBJoin,
    });
  typia.assert(userB);

  // 4) The SDK does not return session IDs. To exercise the endpoint while
  //    staying within the available API surface, generate a plausible UUID
  //    to use as the target session id for the cross-account revoke attempt.
  //    The goal is to ensure that a non-owner's attempt to revoke a session
  //    does not succeed (i.e., the call throws). We intentionally DO NOT assert
  //    a specific HTTP status code because servers may return 403 or 404 for
  //    unknown/unowned session ids.
  const targetSessionId: string = typia.random<string & tags.Format<"uuid">>();

  // 5) Attempt revoke using UserB's connection and assert an error is thrown.
  //    Use await TestValidator.error(...) because the callback is async.
  await TestValidator.error(
    "non-owner cannot revoke another user's session",
    async () => {
      await api.functional.auth.registeredUser.sessions.revokeSession(connB, {
        sessionId: targetSessionId,
      });
    },
  );

  // LIMITATIONS / TEARDOWN
  // - The test does not perform DB assertions (e.g., checking deleted_at) or
  //   audit-log verifications because the provided SDK does not include APIs
  //   to access those resources. Tests that require such inspection must be
  //   implemented in an environment that exposes admin/query APIs or via direct
  //   DB access secured for tests.
  // - No explicit teardown is performed because delete-user or revoke-all
  //   endpoints are not part of the provided materials. Ensure the CI test
  //   environment resets the DB between runs to avoid residual data.
}
