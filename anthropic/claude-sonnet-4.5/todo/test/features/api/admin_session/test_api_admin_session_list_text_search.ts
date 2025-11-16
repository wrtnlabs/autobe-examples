import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdminSession";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Test general text search functionality across session fields.
 *
 * Validates that administrators can use fuzzy matching to quickly find sessions
 * containing specific connection information. Creates admin sessions with known
 * IP addresses, hrefs, and referrers, then performs text searches using partial
 * values to verify search works across multiple text fields.
 *
 * Test workflow:
 *
 * 1. Create admin account with known session data (IP, href, referrer)
 * 2. Generate additional sessions by creating more admin accounts with distinct
 *    values
 * 3. Perform text searches using partial IP addresses
 * 4. Perform text searches using URL fragments and domain names
 * 5. Verify search results contain sessions matching the search criteria
 * 6. Confirm partial matches work across ip, href, and referrer fields
 */
export async function test_api_admin_session_list_text_search(
  connection: api.IConnection,
) {
  // Create first admin with known session data
  const knownIp = "192.168.1.100";
  const knownHref = "https://admin.example.com/dashboard/login";
  const knownReferrer = "https://admin.example.com/welcome";

  const admin1 = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      ip: knownIp,
      href: knownHref,
      referrer: knownReferrer,
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin1);

  // Create additional admins with different session data for comprehensive search testing
  const admin2 = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      ip: "10.0.0.50",
      href: "https://portal.testing.com/admin/sessions",
      referrer: "https://portal.testing.com/login",
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin2);

  const admin3 = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      ip: "192.168.2.25",
      href: "https://example.org/admin/home",
      referrer: "https://example.org/",
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin3);

  // Test 1: Search by partial IP address matching admin1
  const searchByIpPartial =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: admin1.id,
      body: {
        search: "192.168.1",
      } satisfies ITodoListAdminSession.IRequest,
    });
  typia.assert(searchByIpPartial);
  TestValidator.predicate(
    "search by partial IP should return results",
    searchByIpPartial.data.length > 0,
  );
  const matchingSession1 = searchByIpPartial.data.find((s) => s.ip === knownIp);
  typia.assertGuard(matchingSession1!);
  TestValidator.equals(
    "found session IP matches known IP",
    matchingSession1.ip,
    knownIp,
  );

  // Test 2: Search by domain name in href
  const searchByDomain =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: admin1.id,
      body: {
        search: "admin.example.com",
      } satisfies ITodoListAdminSession.IRequest,
    });
  typia.assert(searchByDomain);
  TestValidator.predicate(
    "search by domain should return results",
    searchByDomain.data.length > 0,
  );
  const domainMatch = searchByDomain.data.find((s) =>
    s.href.includes("admin.example.com"),
  );
  typia.assertGuard(domainMatch!);
  TestValidator.predicate(
    "found session href contains domain",
    domainMatch.href.includes("admin.example.com"),
  );

  // Test 3: Search by URL path fragment
  const searchByPath =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: admin1.id,
      body: {
        search: "dashboard",
      } satisfies ITodoListAdminSession.IRequest,
    });
  typia.assert(searchByPath);
  TestValidator.predicate(
    "search by path fragment should return results",
    searchByPath.data.length > 0,
  );
  const pathMatch = searchByPath.data.find((s) => s.href.includes("dashboard"));
  typia.assertGuard(pathMatch!);
  TestValidator.predicate(
    "found session href contains path fragment",
    pathMatch.href.includes("dashboard"),
  );

  // Test 4: Search by referrer domain
  const searchByReferrer =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: admin1.id,
      body: {
        search: "welcome",
      } satisfies ITodoListAdminSession.IRequest,
    });
  typia.assert(searchByReferrer);
  TestValidator.predicate(
    "search by referrer fragment should return results",
    searchByReferrer.data.length > 0,
  );
  const referrerMatch = searchByReferrer.data.find((s) =>
    s.referrer.includes("welcome"),
  );
  typia.assertGuard(referrerMatch!);
  TestValidator.predicate(
    "found session referrer contains fragment",
    referrerMatch.referrer.includes("welcome"),
  );

  // Test 5: Search across different admin's sessions
  const searchAdmin2Sessions =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: admin2.id,
      body: {
        search: "portal.testing",
      } satisfies ITodoListAdminSession.IRequest,
    });
  typia.assert(searchAdmin2Sessions);
  TestValidator.predicate(
    "search for admin2 sessions should return results",
    searchAdmin2Sessions.data.length > 0,
  );
  const admin2Match = searchAdmin2Sessions.data.find((s) =>
    s.href.includes("portal.testing.com"),
  );
  typia.assertGuard(admin2Match!);
  TestValidator.equals(
    "found session belongs to admin2",
    admin2Match.todo_list_admin_id,
    admin2.id,
  );

  // Test 6: Search with IP octet
  const searchByIpOctet =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: admin3.id,
      body: {
        search: "192.168.2",
      } satisfies ITodoListAdminSession.IRequest,
    });
  typia.assert(searchByIpOctet);
  TestValidator.predicate(
    "search by IP octet should return results",
    searchByIpOctet.data.length > 0,
  );
  const ipOctetMatch = searchByIpOctet.data.find((s) =>
    s.ip.startsWith("192.168.2"),
  );
  typia.assertGuard(ipOctetMatch!);
  TestValidator.predicate(
    "found session IP starts with searched octet",
    ipOctetMatch.ip.startsWith("192.168.2"),
  );
}
