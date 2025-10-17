import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPagination";
import type { IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPagination";

export async function test_api_administrator_list_and_revoke_sessions(
  connection: api.IConnection,
) {
  /**
   * Purpose: Validate administrator session listing and targeted revocation.
   *
   * Steps implemented:
   *
   * 1. Create a fresh administrator account via POST /auth/administrator/join
   * 2. List active sessions via POST /auth/administrator/sessions/revoke with null
   *    body
   * 3. Revoke a specific session by id via POST
   *    /auth/administrator/sessions/revoke
   * 4. Validate that the revoked session is no longer active or is marked deleted
   *
   * Notes:
   *
   * - The SDK's join() call attaches the returned access token to
   *   connection.headers automatically (see SDK behavior). Therefore subsequent
   *   calls are authenticated.
   * - The test intentionally avoids testing refresh-token invalidation and
   *   audit-log verification because the SDK material provided does not include
   *   refresh or audit endpoints. These checks are documented in comments and
   *   in the review notes.
   */

  // 1) Create administrator account
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassw0rd!",
    username: RandomGenerator.name(1),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const authorized: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminBody,
    });
  // Runtime type validation
  typia.assert(authorized);

  // Extract useful values
  const adminId: string = authorized.id;
  const token: IAuthorizationToken = authorized.token;

  // Basic sanity checks
  TestValidator.predicate(
    "join returned administrator id",
    typeof adminId === "string" && adminId.length > 0,
  );
  typia.assert(token);

  // 2) List sessions (non-mutating listing operation) by sending null body
  const sessionsListBefore: IEconPoliticalForumAdministrator.ISessionsListResponse =
    await api.functional.auth.administrator.sessions.revoke.revokeSessions(
      connection,
      { body: null },
    );
  typia.assert(sessionsListBefore);

  // Validate pagination shape and presence of data
  TestValidator.predicate(
    "sessions listing returns pagination object",
    sessionsListBefore.pagination !== undefined &&
      sessionsListBefore.data !== undefined,
  );

  // Find a session that belongs to the created admin
  const mySession = sessionsListBefore.data.find(
    (s) => s.registereduser_id === adminId,
  );

  TestValidator.predicate(
    "session list contains session for created admin",
    mySession !== undefined,
  );

  if (!mySession) {
    // Fail fast: the test cannot continue meaningfully without a session to revoke
    throw new Error("No session found for the newly created administrator.");
  }

  // 3) Revoke the specific session by id
  const targetSessionId: string = mySession.id;

  const revokeRequest = {
    session_ids: [targetSessionId],
  } satisfies IEconPoliticalForumAdministrator.ISessionsRevokeRequest;

  const revokeResponse: IEconPoliticalForumAdministrator.ISessionsListResponse =
    await api.functional.auth.administrator.sessions.revoke.revokeSessions(
      connection,
      { body: revokeRequest },
    );
  typia.assert(revokeResponse);

  // 4) Post-action validation
  // Check whether the target session has been removed from active sessions
  const stillPresent = revokeResponse.data.find(
    (s) => s.id === targetSessionId,
  );

  // The server implementation may either omit the revoked session from the active
  // list, or include it with deleted_at set. Both are acceptable behaviors.
  const revokedMarked =
    stillPresent === undefined
      ? true
      : stillPresent.deleted_at !== null &&
        stillPresent.deleted_at !== undefined;

  TestValidator.predicate(
    "revoked session is removed or marked deleted",
    revokedMarked,
  );

  // NOTES / SKIPPED CHECKS
  // - Refresh-token invalidation check: requires POST /auth/administrator/refresh which
  //   is not present in the provided SDK functions. When the refresh endpoint is
  //   added to the SDK, the following check should be implemented:
  //     Try to refresh tokens using the original refresh token returned by join().
  //     Expect the refresh attempt to fail (401/403) for a revoked session.
  // - Audit log verification: requires an audit-log retrieval API to assert that an
  //   audit entry was created for the revocation. Because no such API was provided,
  //   this test records a TODO for the developer to add the audit verification step
  //   once an appropriate endpoint exists.

  // Cleanup guidance (documented):
  // - The test created a persistent administrator account. The test framework or CI
  //   environment should remove or reset test accounts between runs. Avoid revoking
  //   all sessions here because that could invalidate the current connection's
  //   Authorization token and make subsequent test steps (or automatic teardown)
  //   harder. Prefer external DB reset or scheduled teardown of test accounts.
}
