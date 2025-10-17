import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumRegisteredUser";

/**
 * Validate administrator can search registered users by a partial username and
 * receive sanitized summaries without leaking sensitive fields.
 *
 * Steps:
 *
 * 1. Create a fresh administrator account via POST /auth/administrator/join using
 *    a cloned connection so the returned admin token is kept on the
 *    admin-specific connection object.
 * 2. Create three registered users (alice_econ, bob_econ, carol_finance) each via
 *    their own cloned connection to avoid overwriting the admin connection's
 *    Authorization header.
 * 3. As the administrator, call PATCH /econPoliticalForum/administrator/users with
 *    a partial username filter { username: 'econ' } and pagination parameters
 *    page=1, limit=20.
 * 4. Assert:
 *
 *    - Response conforms to IPageIEconPoliticalForumRegisteredUser.ISummary
 *         (typia.assert).
 *    - Pagination metadata current === 1 and limit === 20.
 *    - At least the two expected usernames containing 'econ' are present in the
 *         returned data set.
 *    - Each returned summary includes id and username fields.
 *    - Sensitive internal fields such as password_hash, failed_login_attempts,
 *         locked_until, and session tokens are NOT present in any summary
 *         object.
 *
 * Note: This test relies on test DB isolation for teardown and does not
 * explicitly delete created accounts.
 */
export async function test_api_registered_user_search_admin_basic(
  connection: api.IConnection,
) {
  // 1) Create administrator using a cloned connection so SDK populates token
  const adminConn: api.IConnection = { ...connection, headers: {} };

  const adminEmail = `admin+${RandomGenerator.alphaNumeric(6)}@example.com`;
  const adminPassword = "AdminPassw0rd!"; // >=10 chars to satisfy admin password guideline

  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(adminConn, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: `admin_${RandomGenerator.alphaNumeric(4)}`,
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2) Create multiple registered users as separate connection clones
  const usernames = ["alice_econ", "bob_econ", "carol_finance"] as const;
  const created: IEconPoliticalForumRegisteredUser.IAuthorized[] = [];

  for (const name of usernames) {
    const userConn: api.IConnection = { ...connection, headers: {} };
    const email = `${name}.${RandomGenerator.alphaNumeric(4)}@example.com`;
    const user: IEconPoliticalForumRegisteredUser.IAuthorized =
      await api.functional.auth.registeredUser.join(userConn, {
        body: {
          username: name,
          email,
          password: "UserPassw0rd!",
          display_name: RandomGenerator.name(),
        } satisfies IEconPoliticalForumRegisteredUser.IJoin,
      });
    typia.assert(user);
    created.push(user);
  }

  // 3) As admin, perform partial username search 'econ'
  const pageResult: IPageIEconPoliticalForumRegisteredUser.ISummary =
    await api.functional.econPoliticalForum.administrator.users.index(
      adminConn,
      {
        body: {
          username: "econ",
          page: 1,
          limit: 20,
        } satisfies IEconPoliticalForumRegisteredUser.IRequest,
      },
    );
  typia.assert(pageResult);

  // 4) Assertions
  TestValidator.equals(
    "pagination current is 1",
    pageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    pageResult.pagination.limit,
    20,
  );

  // At least two users with 'econ' in username must be present
  TestValidator.predicate(
    "results contain at least two usernames with 'econ'",
    pageResult.data.filter((u) => u.username.includes("econ")).length >= 2,
  );

  // Each returned summary must include id and username
  TestValidator.predicate(
    "each summary has id and username",
    pageResult.data.every(
      (u) => typeof u.id === "string" && typeof u.username === "string",
    ),
  );

  // Sensitive fields must NOT be present in any returned summary
  TestValidator.predicate(
    "no sensitive internal fields in summaries",
    pageResult.data.every(
      (u) =>
        !Object.prototype.hasOwnProperty.call(u, "password_hash") &&
        !Object.prototype.hasOwnProperty.call(u, "failed_login_attempts") &&
        !Object.prototype.hasOwnProperty.call(u, "locked_until") &&
        !Object.prototype.hasOwnProperty.call(u, "session_token"),
    ),
  );

  // Confirm that specifically alice_econ and bob_econ are present
  TestValidator.predicate(
    "alice_econ is present",
    pageResult.data.some((u) => u.username === "alice_econ"),
  );
  TestValidator.predicate(
    "bob_econ is present",
    pageResult.data.some((u) => u.username === "bob_econ"),
  );

  // End: rely on test DB reset for cleanup
}
