import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that an authenticated registered user can list their active
 * sessions.
 *
 * Business purpose:
 *
 * - Ensure newly-registered users receive an initial session and can retrieve a
 *   session list containing safe session summary metadata.
 *
 * Steps:
 *
 * 1. Register a fresh user via POST /auth/registeredUser/join.
 * 2. Call GET /auth/registeredUser/sessions using the same connection (SDK
 *    attaches Authorization header after join).
 * 3. Assert HTTP/response shapes and business rules (e.g., expires_at in the
 *    future).
 */
export async function test_api_registereduser_list_sessions_success(
  connection: api.IConnection,
) {
  // 1) Create a new registered user (join)
  const joinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: `${RandomGenerator.name(1).replace(/\s+/g, "").toLowerCase()}+${Date.now()}@example.com`,
    password: "TestPass12345", // >=10 chars as recommended
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const authorized: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  // Runtime type validation
  typia.assert(authorized);

  // 2) List sessions for the authenticated user
  const sessions: IEconPoliticalForumRegisteredUser.ISessionList =
    await api.functional.auth.registeredUser.sessions.listSessions(connection);
  typia.assert(sessions);
  typia.assert(sessions.pagination);

  // 3) Business validations
  TestValidator.predicate(
    "session list should contain at least one session",
    sessions.data.length > 0,
  );

  // Ensure pagination information aligns with returned data
  TestValidator.predicate(
    "pagination.records should be >= returned session count",
    sessions.pagination.records >= sessions.data.length,
  );

  // Inspect the first session for expected metadata and semantics
  const first = sessions.data[0];
  typia.assert(first);

  TestValidator.predicate(
    "session.expires_at should be in the future",
    Date.parse(first.expires_at) > Date.now(),
  );

  // Lightweight sanity checks; deep format checks are handled by typia.assert
  TestValidator.predicate(
    "session has id string",
    typeof first.id === "string",
  );
  TestValidator.predicate(
    "session has created_at string",
    typeof first.created_at === "string",
  );

  // 4) Teardown
  // The provided SDK materials do not include session revocation endpoints.
  // Therefore explicit revocation cannot be performed here. Tests should be
  // executed in an isolated environment (transaction rollback or ephemeral
  // test schema) and the test harness/CI should perform cleanup of created
  // users/sessions after the test completes.
}
