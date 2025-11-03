import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingAdminSession";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdminSession";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Test secure, audit-compliant admin session retrieval
 *
 * 1. Register an admin with a unique business email, secure password, RBAC role,
 *    and "active" status
 * 2. Login as the new admin to generate session record, save login context (href,
 *    referrer, IP)
 * 3. Fetch session histories using filtering (status, IP, dates), ordering,
 *    pagination; verify results/scoping
 * 4. Check unauthorized access is blocked
 */
export async function test_api_admin_fetch_admin_session_history_with_security_compliance(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16) + "1!Aa";
  const adminName = RandomGenerator.name();
  const adminRole = "super"; // RBAC example
  const adminStatus = "active";
  const joinBody = {
    email: adminEmail,
    password: adminPassword,
    name: adminName,
    role: adminRole,
    status: adminStatus,
  } satisfies IShoppingAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, adminEmail);
  TestValidator.equals("admin role matches", admin.role, adminRole);
  TestValidator.equals("admin status matches", admin.status, adminStatus);

  // 2. Login as admin to establish session
  const adminHref = "https://admin.shoppingplatform.test/dashboard";
  const adminReferrer = "https://admin.shoppingplatform.test/login";
  // Deliberately supply a random IPv4 for traceability
  const adminIp = typia.random<string & tags.Format<"ipv4">>();
  const loginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: adminIp,
    href: adminHref,
    referrer: adminReferrer,
  } satisfies IShoppingAdmin.ILogin;
  const authorized = await api.functional.auth.admin.login(connection, {
    body: loginBody,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "authorized id matches joined id",
    authorized.id,
    admin.id,
  );

  // 3. Query session list (active) for this admin
  const nowIso = new Date().toISOString();
  const reqBody: IShoppingAdminSession.IRequest = {
    status: "active",
    ip: adminIp,
    login_time_from: authorized.created_at, // after creation
    login_time_to: nowIso,
    order_by: "created_at",
    order_direction: "desc",
    page: 1 as number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Default<20> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  };
  const sessionsPage =
    await api.functional.shopping.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: reqBody,
    });
  typia.assert(sessionsPage);
  // Pagination sanity
  TestValidator.equals(
    "pagination current page",
    sessionsPage.pagination.current,
    reqBody.page,
  );
  TestValidator.equals(
    "pagination limit",
    sessionsPage.pagination.limit,
    reqBody.limit,
  );
  // Check each session's metadata
  for (const session of sessionsPage.data) {
    typia.assert(session);
    TestValidator.equals(
      "session links correct admin",
      session.shopping_admin_id,
      admin.id,
    );
    TestValidator.equals("session origin IP", session.ip, adminIp);
    TestValidator.predicate(
      "session login after creation_from",
      new Date(session.created_at) >= new Date(authorized.created_at),
    );
    if (session.expired_at !== null && session.expired_at !== undefined) {
      TestValidator.predicate(
        "expired session expired_at after created_at",
        new Date(session.expired_at) >= new Date(session.created_at),
      );
    }
    // No sensitive auth fields exposed
    TestValidator.predicate(
      "no tokens in session summary",
      !("token" in session),
    );
  }

  // 4. Assert session endpoint is protected: try with unauthenticated connection (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "session endpoint blocks unauthenticated access",
    async () => {
      await api.functional.shopping.admin.admins.sessions.index(unauthConn, {
        adminId: admin.id,
        body: reqBody,
      });
    },
  );
}
