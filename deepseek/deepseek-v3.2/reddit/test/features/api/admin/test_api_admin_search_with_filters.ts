import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test advanced filtering capabilities of the admin search endpoint.
 * 1. Create multiple admin accounts with different email patterns and creation dates
 * 2. Test partial email matching using 'search' parameter
 * 3. Test creation date range filtering
 * 4. Test 'include_deleted=true' filter for showing deleted admins
 * 5. Validate filter combinations work correctly
 */
export async function test_api_admin_search_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create test data with different email patterns
  const admins: ICommunityPlatformAdmin.IAuthorized[] = [];
  // Admin 1: Contains 'test' in email
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {
    body: {
      email: "admin1_test@example.com",
      password: "password123",
      href: "https://example.com/admin",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies DeepPartial<ICommunityPlatformAdmin.IJoin>,
  });
  typia.assert(admin1);
  admins.push(admin1);
  // Wait a bit to create time difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Admin 2: Different pattern, created later
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {
    body: {
      email: "admin2@sample.com",
      password: "password123",
      href: "https://example.com/admin",
      referrer: "https://example.com",
      ip: "192.168.1.2",
    } satisfies DeepPartial<ICommunityPlatformAdmin.IJoin>,
  });
  typia.assert(admin2);
  admins.push(admin2);
  // Wait for third admin creation
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Admin 3: Another email with 'test'
  const admin3Connection: api.IConnection = { host: connection.host };
  const admin3 = await authorize_admin_join(admin3Connection, {
    body: {
      email: "test_admin3@example.com",
      password: "password123",
      href: "https://example.com/admin",
      referrer: "https://example.com",
      ip: "192.168.1.3",
    } satisfies DeepPartial<ICommunityPlatformAdmin.IJoin>,
  });
  typia.assert(admin3);
  admins.push(admin3);
  // Use admin1's authenticated connection for search operations
  // admin1Connection already has Authorization header set by authorize_admin_join
  // Test 1: Search by partial email match
  const searchResult1 = await api.functional.communityPlatform.admins.index(
    admin1Connection,
    {
      body: {
        search: "test",
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(searchResult1);
  // Verify email search returns admins with 'test' in email
  const testEmails = searchResult1.data
    .map((admin) => admin.email.toLowerCase())
    .filter((email) => email.includes("test"));
  TestValidator.equals(
    "email search returns only matching records",
    testEmails.length,
    searchResult1.data.length,
  );
  // Test 2: Creation date range filtering
  // Get creation time of the middle admin (admin2)
  const admin2Search = await api.functional.communityPlatform.admins.index(
    admin1Connection,
    {
      body: {
        search: "admin2@sample.com",
        limit: 1,
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(admin2Search);
  const admin2Record = admin2Search.data[0];
  const admin2CreatedAt = new Date(admin2Record.created_at);
  // Create a date range that should include all three admins
  const startDate = new Date(admin2CreatedAt.getTime() - 5000); // 5 seconds before admin2
  const endDate = new Date(admin2CreatedAt.getTime() + 5000); // 5 seconds after admin2
  const dateRangeResult = await api.functional.communityPlatform.admins.index(
    admin1Connection,
    {
      body: {
        start_created_at: startDate.toISOString(),
        end_created_at: endDate.toISOString(),
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(dateRangeResult);
  // Should find at least the three test admins
  TestValidator.predicate(
    "date range returns admins created within range",
    dateRangeResult.data.length >= 3,
  );
  // Test 3: include_deleted filter (note: no delete endpoint available in DTOs)
  // Since we cannot delete admins with current API, we can only test default behavior
  const activeOnlyResult = await api.functional.communityPlatform.admins.index(
    admin1Connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(activeOnlyResult);
  const allResult = await api.functional.communityPlatform.admins.index(
    admin1Connection,
    {
      body: {
        include_deleted: true,
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(allResult);
  // With no deleted admins, counts should be same
  TestValidator.equals( // error: Expected 3-4 arguments, but got 2.
    "include_deleted=true returns same as default when no deletions",
    allResult.data, // expected value
    activeOnlyResult.data, // actual value
  );
}