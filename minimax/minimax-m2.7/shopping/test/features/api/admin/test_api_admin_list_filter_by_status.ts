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
 * Test admin listing with status filter.
 *
 * Validates that a super administrator can filter administrator accounts by their account status using the PATCH endpoint. The test verifies:
 *
 * 1. Super admin authentication and authorization
 * 2. Status filter functionality - 'active' returns only active administrators (deleted_at IS NULL)
 * 3. Status filter functionality - 'deleted' returns only soft-deleted administrators (deleted_at IS NOT NULL)
 * 4. Response structure consistency across different filter values
 * 5. Pagination metadata accuracy for filtered results
 *
 * 1. Register a super administrator to obtain authentication token.
 * 2. Query with status='active' filter and validate response.
 * 3. Query with status='deleted' filter and validate response.
 * 4. Verify both responses have consistent structure with pagination metadata.
 */
export async function test_api_admin_list_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Query with status='active' filter
  const activeAdmins =
    await api.functional.ecommerceMall.superAdmin.admin.admins.index(
      superAdminConnection,
      {
        body: {
          status: "active",
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(activeAdmins);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current",
    activeAdmins.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", activeAdmins.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records >= 0",
    activeAdmins.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    activeAdmins.pagination.pages >= 0,
  );
  // Validate all returned admins have null deleted_at (active accounts)
  for (const admin of activeAdmins.data) {
    TestValidator.equals("admin should be active", admin.deleted_at, null);
  }
  // 3. Query with status='deleted' filter
  const deletedAdmins =
    await api.functional.ecommerceMall.superAdmin.admin.admins.index(
      superAdminConnection,
      {
        body: {
          status: "deleted",
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(deletedAdmins);
  // Validate response structure is consistent
  TestValidator.equals(
    "deleted pagination current",
    deletedAdmins.pagination.current,
    1,
  );
  TestValidator.equals(
    "deleted pagination limit",
    deletedAdmins.pagination.limit,
    20,
  );
  // Validate all returned admins have non-null deleted_at (soft-deleted accounts)
  for (const admin of deletedAdmins.data) {
    TestValidator.predicate(
      "admin should be deleted",
      admin.deleted_at !== null && admin.deleted_at !== undefined,
    );
  }
}
