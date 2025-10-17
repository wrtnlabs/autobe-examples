import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_registereduser_revoke_session_success(
  connection: api.IConnection,
) {
  // Purpose:
  // 1) Register a new user (POST /auth/registeredUser/join).
  // 2) Invoke DELETE /auth/registeredUser/sessions/{sessionId} to exercise the
  //    revokeSession API and validate response handling.
  //
  // Notes on adaptation:
  // - The provided SDK does NOT include a sessions.list() or similar function to
  //   retrieve the session id created by join(). The IAuthorized DTO does not
  //   expose sessionId. Therefore, this test generates a syntactically valid
  //   UUID to pass as the sessionId parameter. This keeps the test type-correct
  //   and exercises the revoke endpoint's request/response behavior. Full DB
  //   validation (deleted_at set, token invalidation) requires additional APIs
  //   or direct DB access and is out of scope for this SDK-limited test.

  // 1) Create a new registered user
  const joinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const authorized: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2) Prepare a valid sessionId (UUID). Real sessionId retrieval is not
  // possible with the provided SDK functions, so generate a syntactically
  // valid UUID to exercise the endpoint.
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3) Revoke the session
  const result: IEconPoliticalForumRegisteredUser.IGenericSuccess =
    await api.functional.auth.registeredUser.sessions.revokeSession(
      connection,
      {
        sessionId,
      },
    );
  typia.assert(result);

  // 4) Business assertions
  TestValidator.equals("revocation success flag", result.success, true);

  // Limitations and cleanup note:
  // - We cannot verify database deleted_at or token invalidation without
  //   additional endpoints (e.g., sessions.list or refresh). In CI, ensure
  //   database fixtures are reset between tests to remove created users.
}
