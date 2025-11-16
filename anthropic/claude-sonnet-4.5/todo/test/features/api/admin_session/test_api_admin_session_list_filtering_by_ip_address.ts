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
 * Test filtering administrator sessions by specific IP address to support
 * security investigations.
 *
 * This test validates that administrators can retrieve all sessions originating
 * from a particular network location, which is critical for detecting
 * unauthorized access patterns and security incident response. The test creates
 * multiple admin accounts, authenticates to generate sessions with known IP
 * addresses, then retrieves sessions filtered by specific IP addresses.
 *
 * Test flow:
 *
 * 1. Create first administrator account with authentication and capture session IP
 * 2. Retrieve sessions filtered by the first admin's IP address
 * 3. Verify that returned sessions match the exact IP address (exact matching
 *    validation)
 * 4. Create second administrator account to generate additional session data
 * 5. Filter sessions by second admin's IP to verify proper isolation
 * 6. Test with non-existent IP address to verify proper empty result handling
 */
export async function test_api_admin_session_list_filtering_by_ip_address(
  connection: api.IConnection,
) {
  // Step 1: Create first administrator account and authenticate
  const firstAdminEmail = typia.random<string & tags.Format<"email">>();
  const firstAdminIp = "192.168.1.100";

  const firstAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: firstAdminEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      ip: firstAdminIp,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(firstAdmin);

  // Step 2: Retrieve sessions filtered by first admin's IP address
  const firstAdminSessionsPage =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: firstAdmin.id,
      body: {
        ip: firstAdminIp,
      } satisfies ITodoListAdminSession.IRequest,
    });
  typia.assert(firstAdminSessionsPage);

  // Step 3: Validate that returned sessions match the exact IP address
  TestValidator.predicate(
    "first admin should have at least one session",
    firstAdminSessionsPage.data.length > 0,
  );

  for (const session of firstAdminSessionsPage.data) {
    TestValidator.equals("session IP matches filter", session.ip, firstAdminIp);
  }

  // Step 4: Create second administrator account to generate additional session data
  const secondAdminEmail = typia.random<string & tags.Format<"email">>();
  const secondAdminIp = "10.0.0.50";

  const secondAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: secondAdminEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      ip: secondAdminIp,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(secondAdmin);

  // Step 5: Filter sessions by second admin's IP to verify proper isolation
  const secondAdminSessionsPage =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: secondAdmin.id,
      body: {
        ip: secondAdminIp,
      } satisfies ITodoListAdminSession.IRequest,
    });
  typia.assert(secondAdminSessionsPage);

  TestValidator.predicate(
    "second admin should have at least one session",
    secondAdminSessionsPage.data.length > 0,
  );

  for (const session of secondAdminSessionsPage.data) {
    TestValidator.equals(
      "second admin session IP matches filter",
      session.ip,
      secondAdminIp,
    );
  }

  // Step 6: Test with non-existent IP address to verify proper empty result handling
  const nonExistentIp = "255.255.255.254";

  const emptySessionsPage =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: firstAdmin.id,
      body: {
        ip: nonExistentIp,
      } satisfies ITodoListAdminSession.IRequest,
    });
  typia.assert(emptySessionsPage);

  TestValidator.equals(
    "no sessions should be found for non-existent IP",
    emptySessionsPage.data.length,
    0,
  );

  TestValidator.equals(
    "pagination should show zero records",
    emptySessionsPage.pagination.records,
    0,
  );
}
