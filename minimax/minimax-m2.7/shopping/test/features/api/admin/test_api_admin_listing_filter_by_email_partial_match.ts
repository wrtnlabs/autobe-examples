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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that a super administrator can search for administrators using partial email matching with case-insensitive filtering.
 *
 * Validates the admin listing search functionality by testing partial email matching with different search strings. The endpoint supports case-insensitive substring matching on administrator email addresses.
 *
 * **Key Validations:**
 * - Partial email matching returns only administrators whose emails contain the search string
 * - Matching is case-insensitive ("admin" matches "Admin@test.com", "ADMIN@test.com")
 * - Deleted administrators are excluded by default
 * - Pagination metadata reflects filtered results correctly
 *
 * 1. Authenticate as a super administrator
 * 2. Search with partial email "admin" and verify results
 * 3. Search with different partial strings to verify matching
 * 4. Test case-insensitivity with uppercase search terms
 * 5. Verify deleted accounts are excluded from results
 * 6. Validate pagination structure is correct
 */
export async function test_api_admin_listing_filter_by_email_partial_match(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Test partial email matching with "admin" (case-insensitive)
  const adminFilterResult =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          email: "admin",
          limit: 100,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(adminFilterResult);
  // Validate: All returned emails should contain "admin" (case-insensitive)
  for (const admin of adminFilterResult.data) {
    TestValidator.predicate(
      `email "${admin.email}" contains "admin" (case-insensitive)`,
      admin.email.toLowerCase().includes("admin"),
    );
  }
  // 3. Test with "test" partial match
  const testFilterResult =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          email: "test",
          limit: 100,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(testFilterResult);
  // Validate: Results should contain emails with "test" (case-insensitive)
  for (const admin of testFilterResult.data) {
    TestValidator.predicate(
      `email "${admin.email}" contains "test" (case-insensitive)`,
      admin.email.toLowerCase().includes("test"),
    );
  }
  // 4. Test case-insensitivity with uppercase "ADMIN"
  const uppercaseAdminResult =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          email: "ADMIN",
          limit: 100,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(uppercaseAdminResult);
  // Validate: Uppercase "ADMIN" should also match emails containing "admin"
  for (const admin of uppercaseAdminResult.data) {
    TestValidator.predicate(
      `uppercase "ADMIN" matches email "${admin.email}"`,
      admin.email.toLowerCase().includes("admin"),
    );
  }
  // 5. Verify deleted accounts are excluded by default
  for (const admin of adminFilterResult.data) {
    TestValidator.predicate(
      `admin "${admin.email}" is not deleted`,
      admin.deleted_at === undefined || admin.deleted_at === null,
    );
  }
  // 6. Verify pagination structure is correct
  TestValidator.predicate(
    "pagination records is non-negative",
    adminFilterResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination current page is at least 1",
    adminFilterResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is between 1 and 100",
    adminFilterResult.pagination.limit >= 1 &&
      adminFilterResult.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    adminFilterResult.pagination.pages >= 0,
  );
  // 7. Verify that results match between lowercase and uppercase search
  TestValidator.equals(
    "same record count for 'admin' and 'ADMIN' search",
    adminFilterResult.data.length,
    uppercaseAdminResult.data.length,
  );
}
