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
 * Test filtering admin sessions by IP address for security investigation
 * workflows.
 *
 * This test validates the IP address filtering capability essential for
 * security monitoring and incident response. Administrators need to quickly
 * identify all sessions originating from specific IP addresses to detect
 * suspicious access patterns or unauthorized login attempts.
 *
 * Test workflow:
 *
 * 1. Create an admin account (establishes first session with IP tracking)
 * 2. Capture the IP address used during account creation
 * 3. Retrieve sessions filtered by that specific IP address
 * 4. Validate that all returned sessions match the specified IP filter
 * 5. Verify pagination structure and session data integrity
 */
export async function test_api_admin_session_filtering_by_ip_address(
  connection: api.IConnection,
) {
  // Step 1: Create admin account with session tracking
  const testIpAddress = "192.168.1.100";
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePass123!";

  const createBody = {
    email: adminEmail,
    password: adminPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: RandomGenerator.pick([
      "super_admin",
      "moderator",
      "support",
    ] as const),
    email_verified: true,
    ip: testIpAddress,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const createdAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: createBody });
  typia.assert(createdAdmin);

  // Step 2: Retrieve sessions filtered by the IP address
  const sessionRequest = {
    ip: testIpAddress,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallAdminSession.IRequest;

  const sessionResult: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.admins.sessions.index(connection, {
      adminId: createdAdmin.id,
      body: sessionRequest,
    });
  typia.assert(sessionResult);

  // Step 3: Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    sessionResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "total records should be at least 1",
    sessionResult.pagination.records >= 1,
  );

  // Step 4: Validate that all returned sessions match the IP filter
  TestValidator.predicate(
    "should have at least one session",
    sessionResult.data.length > 0,
  );

  for (const session of sessionResult.data) {
    TestValidator.equals(
      "session IP should match filter",
      session.ip,
      testIpAddress,
    );
    TestValidator.equals(
      "session should belong to the created admin",
      session.admin.id,
      createdAdmin.id,
    );
  }

  // Step 5: Verify session data integrity
  const firstSession = sessionResult.data[0];
  typia.assert(firstSession);
  TestValidator.predicate(
    "session should have valid created_at timestamp",
    firstSession.created_at.length > 0,
  );
}
