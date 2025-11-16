import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";

/**
 * Test the general search capability across session metadata fields for quick
 * investigation.
 *
 * This scenario validates that the search parameter provides partial matching
 * across session metadata fields, particularly IP addresses and other available
 * session data. The test creates admin accounts with distinct IP addresses,
 * then uses the search parameter to quickly locate sessions with specific IP
 * patterns.
 *
 * Test Flow:
 *
 * 1. Create multiple admin accounts with different IP addresses
 * 2. Retrieve sessions to establish baseline
 * 3. Perform general search queries by IP address patterns
 * 4. Verify search returns relevant sessions matching the search term
 * 5. Validate search functionality with non-matching terms
 * 6. Test pagination structure
 */
export async function test_api_admin_session_general_search(
  connection: api.IConnection,
) {
  // Step 1: Create first admin account with distinctive IP pattern
  const adminEmail1 = typia.random<string & tags.Format<"email">>();
  const adminPassword1 = typia.random<string & tags.Format<"password">>();

  const admin1: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail1,
        password: adminPassword1,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        ip: "192.168.1.100",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin1);

  // Step 2: Create second admin account with different IP pattern
  const adminEmail2 = typia.random<string & tags.Format<"email">>();
  const adminPassword2 = typia.random<string & tags.Format<"password">>();

  const admin2: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail2,
        password: adminPassword2,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "moderator",
        email_verified: true,
        ip: "10.0.0.50",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin2);

  // Step 3: Retrieve all sessions for first admin
  const allSessions: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.admins.sessions.index(connection, {
      adminId: admin1.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallAdminSession.IRequest,
    });
  typia.assert(allSessions);

  TestValidator.predicate(
    "should have at least one session from registration",
    allSessions.data.length >= 1,
  );

  // Step 4: Test general search by IP address pattern for first admin
  const ipSearchTerm1 = "192.168";
  const ipSearchResults1: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.admins.sessions.index(connection, {
      adminId: admin1.id,
      body: {
        page: 1,
        limit: 10,
        search: ipSearchTerm1,
      } satisfies IShoppingMallAdminSession.IRequest,
    });
  typia.assert(ipSearchResults1);

  TestValidator.predicate(
    "IP search for 192.168 pattern should return sessions",
    ipSearchResults1.data.length > 0,
  );

  const hasMatchingIp1 = ipSearchResults1.data.some((session) =>
    session.ip.includes(ipSearchTerm1),
  );
  TestValidator.predicate(
    "search results should contain sessions with 192.168 IP pattern",
    hasMatchingIp1,
  );

  // Step 5: Test general search by different IP pattern for second admin
  const ipSearchTerm2 = "10.0.0";
  const ipSearchResults2: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.admins.sessions.index(connection, {
      adminId: admin2.id,
      body: {
        page: 1,
        limit: 10,
        search: ipSearchTerm2,
      } satisfies IShoppingMallAdminSession.IRequest,
    });
  typia.assert(ipSearchResults2);

  TestValidator.predicate(
    "IP search for 10.0.0 pattern should return sessions",
    ipSearchResults2.data.length > 0,
  );

  const hasMatchingIp2 = ipSearchResults2.data.some((session) =>
    session.ip.includes(ipSearchTerm2),
  );
  TestValidator.predicate(
    "search results should contain sessions with 10.0.0 IP pattern",
    hasMatchingIp2,
  );

  // Step 6: Test search with non-matching term
  const nonMatchingSearch: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.admins.sessions.index(connection, {
      adminId: admin1.id,
      body: {
        page: 1,
        limit: 10,
        search: "999.999.999.999",
      } satisfies IShoppingMallAdminSession.IRequest,
    });
  typia.assert(nonMatchingSearch);

  TestValidator.equals(
    "search with non-matching IP pattern should return empty results",
    nonMatchingSearch.data.length,
    0,
  );

  // Step 7: Test partial IP search
  const partialIpSearch: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.admins.sessions.index(connection, {
      adminId: admin1.id,
      body: {
        page: 1,
        limit: 10,
        search: "168.1",
      } satisfies IShoppingMallAdminSession.IRequest,
    });
  typia.assert(partialIpSearch);

  TestValidator.predicate(
    "partial IP search should support substring matching",
    partialIpSearch.data.length > 0,
  );

  // Step 8: Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid current page",
    allSessions.pagination.current >= 1,
  );

  TestValidator.predicate(
    "pagination should have valid limit",
    allSessions.pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination records should match or exceed data length",
    allSessions.pagination.records >= allSessions.data.length,
  );

  TestValidator.predicate(
    "pagination pages should be calculated correctly",
    allSessions.pagination.pages >= 0,
  );
}
