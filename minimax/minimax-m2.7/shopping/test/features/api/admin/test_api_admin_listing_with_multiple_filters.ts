import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that a super administrator can filter administrator accounts using multiple search criteria including email pattern, name pattern, status filter, and date range.
 *
 * Validates the complete admin listing flow with multiple filter criteria. Tests that a super administrator can successfully query administrators using combined filters for email pattern, display name pattern, account status, and creation date range. Ensures all returned records match the specified criteria and pagination works correctly.
 *
 * 1. Super administrator authenticates via /auth/superAdmin/join
 * 2. Creates multiple test admin accounts with predictable email and name patterns (some with "admin" in email, some with "John" in name)
 * 3. Sends PATCH request to /admin/admin/admins with combined filter criteria
 * 4. Validates response contains pagination metadata and data array
 * 5. Verifies all returned administrators match the specified filters
 */
export async function test_api_admin_listing_with_multiple_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(superAdmin);
  // 2. Create test admin accounts with known patterns
  // Admin 1: email contains "admin", name contains "John"
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      name: "John Smith",
    },
  });
  typia.assert(admin1);
  // Admin 2: email contains "admin", name contains "John"
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      name: "John Doe",
    },
  });
  typia.assert(admin2);
  // Admin 3: email contains "admin" but name does NOT contain "John"
  const admin3Connection: api.IConnection = { host: connection.host };
  const admin3 = await authorize_admin_join(admin3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      name: "Sarah Wilson",
    },
  });
  typia.assert(admin3);
  // 3. Query admins with multiple filters
  const response = await api.functional.ecommerceMall.admin.admin.admins.index(
    superAdminConnection,
    {
      body: {
        email: "admin",
        name: "John",
        status: "active",
        createdAfter: "2024-01-01T00:00:00.000Z",
        createdBefore: "2025-12-31T23:59:59.999Z",
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(response);
  // 4. Validate pagination metadata
  TestValidator.equals("pagination exists", response.pagination !== null, true);
  TestValidator.predicate(
    "page number is valid",
    response.pagination.pages >= 1,
  );
  TestValidator.predicate("limit is valid", response.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 5. Validate all returned admins match the filter criteria
  for (const admin of response.data) {
    TestValidator.predicate(
      "email contains 'admin' (case-insensitive)",
      admin.email.toLowerCase().includes("admin"),
    );
    TestValidator.predicate(
      "name contains 'John' (case-insensitive)",
      admin.name.toLowerCase().includes("john"),
    );
    TestValidator.equals(
      "admin is active (deleted_at is null)",
      admin.deleted_at,
      null,
    );
    TestValidator.predicate(
      "created_at within date range",
      new Date(admin.created_at) >= new Date("2024-01-01T00:00:00.000Z") &&
        new Date(admin.created_at) <= new Date("2025-12-31T23:59:59.999Z"),
    );
  }
  // 6. Verify admins with matching patterns are included
  const matchingEmails = response.data.map((a) => a.email);
  TestValidator.predicate(
    "admin1 is in results",
    matchingEmails.includes(admin1.email),
  );
  TestValidator.predicate(
    "admin2 is in results",
    matchingEmails.includes(admin2.email),
  );
  // 7. Verify admin3 (name does not contain "John") is NOT included
  TestValidator.predicate(
    "admin3 (Sarah) is NOT in results",
    !matchingEmails.includes(admin3.email),
  );
}