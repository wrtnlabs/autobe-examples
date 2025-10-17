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

export async function test_api_administrator_refresh_revoked_token(
  connection: api.IConnection,
) {
  /**
   * Purpose
   *
   * This end-to-end test verifies that a refresh token previously issued by
   * POST /auth/administrator/join is rejected after its session has been
   * revoked. The test covers: registration (join), session revocation
   * (revokeSessions with revoke_all), sessions listing to confirm revocation,
   * attempting token refresh with the revoked token (expect 401/403), and a
   * final sessions listing to ensure no active sessions remain. The test uses
   * only the provided SDK functions and DTO types.
   */

  // 1) Create administrator account and capture tokens
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12); // satisfies MinLength<10>
  const adminUsername = RandomGenerator.name(1);

  const joinBody = {
    email: adminEmail,
    password: adminPassword,
    username: adminUsername,
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const authorized: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Capture tokens and admin id
  const previousRefreshToken: string = authorized.token.refresh;
  TestValidator.predicate(
    "join returned a refresh token",
    typeof previousRefreshToken === "string" && previousRefreshToken.length > 0,
  );
  TestValidator.predicate(
    "join returned admin id",
    typeof authorized.id === "string" && authorized.id.length > 0,
  );

  // 2) Revoke the administrator's sessions (revoke_all because join did not
  // return explicit session id). This simulates server-side session revocation
  // that should invalidate the previously issued refresh token.
  await api.functional.auth.administrator.sessions.revoke.revokeSessions(
    connection,
    {
      body: {
        revoke_all: true,
      } satisfies IEconPoliticalForumAdministrator.ISessionsRevokeRequest,
    },
  );

  // 3) List sessions to confirm revocation was applied
  const listAfterRevoke: IEconPoliticalForumAdministrator.ISessionsListResponse =
    await api.functional.auth.administrator.sessions.revoke.revokeSessions(
      connection,
      { body: null }, // listing operation
    );
  typia.assert(listAfterRevoke);

  // Filter sessions belonging to this admin
  const adminSessions = listAfterRevoke.data.filter(
    (s) => s.registereduser_id === authorized.id,
  );

  // Expect at least one session record (created during join or by policy)
  TestValidator.predicate(
    "sessions list contains at least one session for the created admin",
    adminSessions.length > 0,
  );

  // All admin sessions returned must be revoked (deleted_at not null)
  TestValidator.predicate(
    "all admin sessions are marked revoked (deleted_at set)",
    adminSessions.every(
      (s) => s.deleted_at !== null && s.deleted_at !== undefined,
    ),
  );

  // 4) Attempt to refresh with the previously issued (now revoked) refresh
  // token. Expect HTTP 401 or 403 (unauthorized/forbidden). Use TestValidator
  // httpError to assert the server rejects the attempt.
  await TestValidator.httpError(
    "refresh with revoked token should be rejected",
    [401, 403],
    async () => {
      await api.functional.auth.administrator.refresh(connection, {
        body: {
          refresh_token: previousRefreshToken,
        } satisfies IEconPoliticalForumAdministrator.IRefresh,
      });
    },
  );

  // 5) Re-list sessions to assert no active sessions exist for this admin
  const listFinal: IEconPoliticalForumAdministrator.ISessionsListResponse =
    await api.functional.auth.administrator.sessions.revoke.revokeSessions(
      connection,
      { body: null },
    );
  typia.assert(listFinal);

  const activeForAdmin = listFinal.data.find(
    (s) =>
      s.registereduser_id === authorized.id &&
      (s.deleted_at === null || s.deleted_at === undefined),
  );

  TestValidator.predicate(
    "no active sessions remain for admin after revocation",
    activeForAdmin === undefined,
  );

  // 6) Teardown: ensure cleanup by revoking all sessions again (idempotent)
  await api.functional.auth.administrator.sessions.revoke.revokeSessions(
    connection,
    {
      body: {
        revoke_all: true,
      } satisfies IEconPoliticalForumAdministrator.ISessionsRevokeRequest,
    },
  );
}
