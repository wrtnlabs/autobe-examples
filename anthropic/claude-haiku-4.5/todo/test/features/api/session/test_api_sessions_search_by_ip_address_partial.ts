import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListSession";
import type { ITodoListSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSession";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test searching sessions by partial IP address matching.
 *
 * This test validates that users can search for their authentication sessions
 * using partial IP address patterns. The test performs the following steps:
 *
 * 1. Register a user from a specific IP address (192.168.1.100)
 * 2. Search sessions using partial IP patterns:
 *
 *    - Search for "192.168" (first two octets)
 *    - Search for "192.168.1" (first three octets)
 *    - Search for "192.168.1.100" (full IP address)
 * 3. Verify that sessions matching the partial IP pattern are returned
 * 4. Confirm that no sessions with completely different IPs appear in results
 * 5. Test that exact matches still work correctly
 *
 * Business rules validated:
 *
 * - Partial IP address matching works for session filtering
 * - Only sessions with IPs that start with the search pattern are returned
 * - No false positives from unrelated IP addresses
 */
export async function test_api_sessions_search_by_ip_address_partial(
  connection: api.IConnection,
) {
  // Step 1: Register user from specific IP address
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(12);
  const testIp = "192.168.1.100";

  const userResponse = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
      ip: testIp,
      href: "http://localhost:3000/register" satisfies string &
        tags.Format<"uri">,
      referrer: "http://localhost:3000" satisfies string & tags.Format<"uri">,
      user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(userResponse);

  // Step 2: Search with partial IP - two octets
  const searchPartial2 =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {
        search: "192.168",
        page: 1,
        limit: 10,
      } satisfies ITodoListSession.IRequest,
    });
  typia.assert(searchPartial2);

  TestValidator.predicate(
    "search with partial IP (2 octets) returns results",
    searchPartial2.data.length > 0,
  );

  const matchesPartial2 = searchPartial2.data.filter((session) =>
    session.ip_address.startsWith("192.168"),
  );
  TestValidator.equals(
    "all results match partial IP pattern (192.168)",
    searchPartial2.data.length,
    matchesPartial2.length,
  );

  // Step 3: Search with partial IP - three octets
  const searchPartial3 =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {
        search: "192.168.1",
        page: 1,
        limit: 10,
      } satisfies ITodoListSession.IRequest,
    });
  typia.assert(searchPartial3);

  TestValidator.predicate(
    "search with partial IP (3 octets) returns results",
    searchPartial3.data.length > 0,
  );

  const matchesPartial3 = searchPartial3.data.filter((session) =>
    session.ip_address.startsWith("192.168.1"),
  );
  TestValidator.equals(
    "all results match partial IP pattern (192.168.1)",
    searchPartial3.data.length,
    matchesPartial3.length,
  );

  // Step 4: Search with full IP address
  const searchFullIp =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {
        search: testIp,
        page: 1,
        limit: 10,
      } satisfies ITodoListSession.IRequest,
    });
  typia.assert(searchFullIp);

  TestValidator.predicate(
    "search with full IP address returns results",
    searchFullIp.data.length > 0,
  );

  const matchesFullIp = searchFullIp.data.filter(
    (session) => session.ip_address === testIp,
  );
  TestValidator.equals(
    "all results match full IP address",
    searchFullIp.data.length,
    matchesFullIp.length,
  );

  // Step 5: Test that partial 3-octet search includes sessions from the 4-octet registered IP
  TestValidator.predicate(
    "partial 3-octet search includes the registered session",
    searchPartial3.data.some((session) => session.ip_address === testIp),
  );

  // Step 6: Search with non-matching IP - confirm no false positives
  const searchNonMatching =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {
        search: "10.0.0",
        page: 1,
        limit: 10,
      } satisfies ITodoListSession.IRequest,
    });
  typia.assert(searchNonMatching);

  const noFalsePositives = searchNonMatching.data.every(
    (session) => !session.ip_address.startsWith("192.168"),
  );
  TestValidator.predicate(
    "non-matching IP search does not return unrelated sessions",
    noFalsePositives || searchNonMatching.data.length === 0,
  );

  // Step 7: Verify pagination works with IP search
  const searchWithPagination =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {
        search: "192.168",
        page: 1,
        limit: 5,
      } satisfies ITodoListSession.IRequest,
    });
  typia.assert(searchWithPagination);

  TestValidator.predicate(
    "pagination info is present",
    searchWithPagination.pagination !== undefined,
  );

  TestValidator.predicate(
    "limit is respected in pagination",
    searchWithPagination.data.length <= 5,
  );
}
