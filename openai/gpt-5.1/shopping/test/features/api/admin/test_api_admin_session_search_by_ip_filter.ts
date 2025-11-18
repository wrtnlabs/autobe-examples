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
 * Verify admin can filter own sessions by client IP.
 *
 * Business context: Administrators authenticate through /auth/admin/join and
 * /auth/admin/login, which create rows in shopping_mall_admin_sessions tied to
 * the admin and the login context (ip, href, referrer). Security and audit
 * tooling must be able to filter those sessions by client IP via PATCH
 * /shoppingMall/admin/admins/{adminId}/sessions using
 * IShoppingMallAdminSession.IRequest.ip.
 *
 * This test exercises that behavior end-to-end for a single admin:
 *
 * 1. Create an admin via join to obtain an authorized context and admin id.
 * 2. Perform multiple logins for that admin with different ip values to create
 *    multiple sessions.
 * 3. Call the admin sessions index endpoint with ip set to one of the known IPs
 *    and ensure that only sessions for that admin with that ip are returned.
 * 4. Call the index endpoint again with an ip that matches no existing session and
 *    verify that it returns an empty page (no data, records = 0).
 */
export async function test_api_admin_session_search_by_ip_filter(
  connection: api.IConnection,
) {
  // 1. Register a new admin and obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Allow backend to derive IP if omitted from join; focus IP variation on login.
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const joined: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  const adminId = joined.id;

  // 2. Perform multiple logins with different IPs to create multiple sessions
  const ipA = typia.random<string & tags.Format<"ipv4">>();
  const ipB = typia.random<string & tags.Format<"ipv4">>();

  const loginBodyA = {
    email: joined.email,
    password: joinBody.password,
    ip: ipA,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const loginBodyB = {
    email: joined.email,
    password: joinBody.password,
    ip: ipB,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const loginA: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBodyA,
    });
  typia.assert(loginA);

  const loginB: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBodyB,
    });
  typia.assert(loginB);

  TestValidator.equals(
    "loginA admin id matches join admin id",
    loginA.id,
    adminId,
  );
  TestValidator.equals(
    "loginB admin id matches join admin id",
    loginB.id,
    adminId,
  );

  // 3. Filter sessions by ipA and verify all sessions belong to this admin and ip = ipA
  const requestByIpA = {
    page: 1 satisfies number & tags.Type<"int32">,
    limit: 50 satisfies number & tags.Type<"int32">,
    sort_by: "created_at",
    sort_direction: "desc" as const,
    created_from: null,
    created_to: null,
    ip: ipA,
  } satisfies IShoppingMallAdminSession.IRequest;

  const pageByIpA: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.admins.sessions.index(connection, {
      adminId,
      body: requestByIpA,
    });
  typia.assert(pageByIpA);

  const sessionsByIpA = pageByIpA.data;

  TestValidator.predicate(
    "sessionsByIpA should contain at least one session when filtering by existing IP",
    sessionsByIpA.length > 0,
  );

  for (const session of sessionsByIpA) {
    typia.assert<IShoppingMallAdminSession.ISummary>(session);
    TestValidator.equals(
      "session admin id must match filter adminId",
      session.admin.id,
      adminId,
    );
    TestValidator.equals("session ip must match filtered ipA", session.ip, ipA);
    TestValidator.notEquals(
      "session ip must not equal ipB when filtering by ipA",
      session.ip,
      ipB,
    );
  }

  // 4. Filter by an IP that does not exist among any sessions
  const nonexistentIp = typia.random<string & tags.Format<"ipv4">>();

  const requestByNonexistentIp = {
    page: 1 satisfies number & tags.Type<"int32">,
    limit: 50 satisfies number & tags.Type<"int32">,
    sort_by: "created_at",
    sort_direction: "desc" as const,
    created_from: null,
    created_to: null,
    ip: nonexistentIp,
  } satisfies IShoppingMallAdminSession.IRequest;

  const pageByNonexistentIp: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.admins.sessions.index(connection, {
      adminId,
      body: requestByNonexistentIp,
    });
  typia.assert(pageByNonexistentIp);

  TestValidator.equals(
    "no sessions should be returned when filtering by a nonexistent IP (data.length)",
    pageByNonexistentIp.data.length,
    0,
  );

  TestValidator.predicate(
    "pagination.records should be zero when no sessions match the nonexistent IP filter",
    pageByNonexistentIp.pagination.records === 0,
  );
}
