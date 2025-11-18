import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";

/**
 * Validate cross-admin isolation for admin session search.
 *
 * Business goal: Ensure that the admin session search endpoint `PATCH
 * /shoppingMall/admin/admins/{adminId}/sessions` enforces per-admin isolation
 * under the basic `admin` actor. An administrator should be able to list their
 * own sessions but must not be able to retrieve sessions for a different admin
 * account.
 *
 * Test steps:
 *
 * 1. Create Admin A via POST /auth/admin/join.
 * 2. Create Admin B via POST /auth/admin/join.
 * 3. For each admin, perform an additional login via POST /auth/admin/login to
 *    ensure multiple sessions exist.
 * 4. While authenticated as Admin A, call PATCH
 *    /shoppingMall/admin/admins/{adminId}/sessions with adminId = Admin A.id
 *    and verify:
 *
 *    - The call succeeds.
 *    - All returned session summaries have admin.id === Admin A.id.
 * 5. Still as Admin A, attempt to call the sessions endpoint with adminId = Admin
 *    B.id and assert that the request fails with an authorization error
 *    (without inspecting specific HTTP status).
 * 6. Switch to Admin B by logging in as Admin B.
 * 7. Repeat step 4 for Admin B (self access allowed).
 * 8. Repeat step 5 from Admin B’s perspective (cross-admin access to Admin A’s
 *    sessions must fail).
 * 9. In all successful responses, assert pagination sanity (non-negative counts)
 *    and ensure that no sessions are returned for unintended admins.
 */
export async function test_api_admin_session_search_cross_admin_isolation(
  connection: api.IConnection,
) {
  // Helper to build session search request with a deterministic small page size
  const buildSearchRequest = (): IShoppingMallAdminSession.IRequest => {
    return {
      page: 1,
      limit: 10,
    } satisfies IShoppingMallAdminSession.IRequest;
  };

  // 1. Create Admin A
  const adminAJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminA: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminA);

  // 2. Create Admin B
  const adminBJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminB: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert(adminB);

  // 3. Perform additional logins for each admin to ensure multiple sessions
  const adminALoginBody = {
    email: adminA.email,
    password: adminAJoinBody.password,
    ip: adminAJoinBody.ip ?? null,
    href: adminAJoinBody.href,
    referrer: adminAJoinBody.referrer,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminALogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminALoginBody,
    });
  typia.assert(adminALogin);

  const adminBLoginBody = {
    email: adminB.email,
    password: adminBJoinBody.password,
    ip: adminBJoinBody.ip ?? null,
    href: adminBJoinBody.href,
    referrer: adminBJoinBody.referrer,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminBLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminBLoginBody,
    });
  typia.assert(adminBLogin);

  // Helper to validate that all session summaries belong to the expected admin
  const assertSessionsBelongToAdmin = (
    page: IPageIShoppingMallAdminSession.ISummary,
    expectedAdminId: string,
    titlePrefix: string,
  ): void => {
    typia.assert(page);

    const pagination = page.pagination;
    TestValidator.predicate(
      `${titlePrefix} - current page non-negative`,
      pagination.current >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} - limit non-negative`,
      pagination.limit >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} - records non-negative`,
      pagination.records >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} - pages non-negative`,
      pagination.pages >= 0,
    );

    for (const session of page.data) {
      typia.assert(session);
      TestValidator.equals(
        `${titlePrefix} - session admin id matches`,
        session.admin.id,
        expectedAdminId,
      );
    }
  };

  // 4. As Admin A, list own sessions
  const adminALoginAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminALoginBody,
    });
  typia.assert(adminALoginAgain);

  const adminASelfSessions: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.admins.sessions.index(connection, {
      adminId: adminA.id,
      body: buildSearchRequest(),
    });
  assertSessionsBelongToAdmin(
    adminASelfSessions,
    adminA.id,
    "Admin A self sessions",
  );

  // 5. As Admin A, attempt to access Admin B's sessions (should fail)
  await TestValidator.error(
    "Admin A cannot access Admin B sessions",
    async () => {
      await api.functional.shoppingMall.admin.admins.sessions.index(
        connection,
        {
          adminId: adminB.id,
          body: buildSearchRequest(),
        },
      );
    },
  );

  // 6. Switch to Admin B context by logging in as Admin B
  const adminBLoginAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminBLoginBody,
    });
  typia.assert(adminBLoginAgain);

  // 7. As Admin B, list own sessions
  const adminBSelfSessions: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.admins.sessions.index(connection, {
      adminId: adminB.id,
      body: buildSearchRequest(),
    });
  assertSessionsBelongToAdmin(
    adminBSelfSessions,
    adminB.id,
    "Admin B self sessions",
  );

  // 8. As Admin B, attempt to access Admin A's sessions (should fail)
  await TestValidator.error(
    "Admin B cannot access Admin A sessions",
    async () => {
      await api.functional.shoppingMall.admin.admins.sessions.index(
        connection,
        {
          adminId: adminA.id,
          body: buildSearchRequest(),
        },
      );
    },
  );
}
