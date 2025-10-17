import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_administrator_login_success(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * 1. Create an administrator account via POST /auth/administrator/join
   * 2. Authenticate the same account via POST /auth/administrator/login
   * 3. Validate returned authorization tokens and publicly exposed user summary
   *
   * Preconditions:
   *
   * - The test runner must provide an isolated test database or reset DB between
   *   tests.
   * - No direct DB access is performed in this test because SDK DTOs do not
   *   expose last_login_at or session rows.
   */

  // 1) Prepare request bodies (use `satisfies` to ensure compile-time correctness)
  const adminEmail = "admin+login@example.com";
  const adminPassword = "Str0ngP@ssw0rd!"; // satisfies min length 10

  const joinBody = {
    email: adminEmail,
    password: adminPassword,
    username: "admin_login",
    display_name: "Admin Login Test",
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  // 2) Create administrator account
  const joined: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: joinBody,
    });
  // Validate response shape
  typia.assert(joined);

  // Basic token assertions for join response
  TestValidator.predicate(
    "join: access token exists",
    typeof joined.token.access === "string" && joined.token.access.length > 0,
  );
  TestValidator.predicate(
    "join: refresh token exists",
    typeof joined.token.refresh === "string" && joined.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "join: expired_at is a valid date",
    !Number.isNaN(new Date(joined.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "join: refreshable_until is a valid date",
    !Number.isNaN(new Date(joined.token.refreshable_until).getTime()),
  );

  // If both dates parse, assert ordering semantics when possible
  if (
    !Number.isNaN(new Date(joined.token.expired_at).getTime()) &&
    !Number.isNaN(new Date(joined.token.refreshable_until).getTime())
  ) {
    const expiredAt = new Date(joined.token.expired_at).getTime();
    const refreshableUntil = new Date(joined.token.refreshable_until).getTime();

    TestValidator.predicate(
      "join: refreshable_until is >= expired_at",
      refreshableUntil >= expiredAt,
    );
  }

  // Ensure that the join response does not leak secrets in the public user summary
  if (joined.user !== undefined) {
    TestValidator.predicate(
      "join: user summary present",
      typeof joined.user.id === "string" && joined.user.id.length > 0,
    );
    // Ensure server did not leak password_hash or similar secret properties
    TestValidator.predicate(
      "join: no password_hash leaked",
      !Object.prototype.hasOwnProperty.call(joined.user, "password_hash"),
    );
  }

  // 3) Now perform login using usernameOrEmail and password
  const loginBody = {
    usernameOrEmail: adminEmail,
    password: adminPassword,
  } satisfies IEconPoliticalForumAdministrator.ILogin;

  const authorized: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: loginBody,
    });
  typia.assert(authorized);

  // Token checks on login response
  TestValidator.predicate(
    "login: access token exists",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "login: refresh token exists",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login: expired_at is a valid date",
    !Number.isNaN(new Date(authorized.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "login: refreshable_until is a valid date",
    !Number.isNaN(new Date(authorized.token.refreshable_until).getTime()),
  );

  // Date-order semantics for login tokens
  if (
    !Number.isNaN(new Date(authorized.token.expired_at).getTime()) &&
    !Number.isNaN(new Date(authorized.token.refreshable_until).getTime())
  ) {
    const expiredAt = new Date(authorized.token.expired_at).getTime();
    const refreshableUntil = new Date(
      authorized.token.refreshable_until,
    ).getTime();

    TestValidator.predicate(
      "login: refreshable_until is >= expired_at",
      refreshableUntil >= expiredAt,
    );
  }

  // If both join and login returned user summaries, the IDs should match
  if (joined.user !== undefined && authorized.user !== undefined) {
    TestValidator.equals(
      "user id matches between join and login",
      joined.user.id,
      authorized.user.id,
    );
  }

  // Confirm no sensitive field leaked in login user summary
  if (authorized.user !== undefined) {
    TestValidator.predicate(
      "login: no password_hash leaked",
      !Object.prototype.hasOwnProperty.call(authorized.user, "password_hash"),
    );
  }

  // NOTE: The original scenario asked to check DB fields like last_login_at,
  // failed_login_attempts, and econ_political_forum_sessions rows. Those fields
  // are not exposed by the provided SDK DTOs. To validate those, a separate
  // integration test with DB access or additional admin SDK endpoints is
  // required. This E2E test focuses on observable outcomes via the public SDK.
}
