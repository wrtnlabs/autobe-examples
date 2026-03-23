import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneAdmin";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an authenticated admin can filter administrator accounts by status and username pattern.
 *
 * This test validates:
 * 1. Username pattern filtering (case-insensitive partial match)
 * 2. Status filtering (active, deleted, all)
 * 3. Pagination metadata accuracy
 * 4. Response structure validation
 */
export async function test_api_admin_list_filter_by_status_and_username(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as primary admin
  const adminConnection: api.IConnection = { host: connection.host };
  const primaryAdmin = await authorize_admin_join(adminConnection, {
    body: {
      username: "primary_admin",
    },
  });
  typia.assert(primaryAdmin);
  // 2. Create additional test admin accounts with 'admin' in username
  const testAdmin1 = await authorize_admin_join(adminConnection, {
    body: {
      username: "admin_test1",
    },
  });
  typia.assert(testAdmin1);
  const testAdmin2 = await authorize_admin_join(adminConnection, {
    body: {
      username: "admin_test2",
    },
  });
  typia.assert(testAdmin2);
  const testAdmin3 = await authorize_admin_join(adminConnection, {
    body: {
      username: "superadmin",
    },
  });
  typia.assert(testAdmin3);
  // 3. Test username filtering with 'admin' pattern
  const filteredByAdmin = await api.functional.redditClone.admin.admins.index(
    adminConnection,
    {
      body: {
        status: "all",
        username: "admin",
        page_size: 100,
      } satisfies IRedditCloneAdmin.IRequest,
    },
  );
  typia.assert(filteredByAdmin);
  // Verify all returned admins have 'admin' in username (case-insensitive)
  TestValidator.predicate(
    "all filtered admins contain 'admin' in username",
    filteredByAdmin.data.every((admin) =>
      admin.username.toLowerCase().includes("admin"),
    ),
  );
  // Verify we got at least 4 admins (primary + 3 test admins)
  TestValidator.predicate(
    "filtered results include at least 4 admins",
    filteredByAdmin.data.length >= 4,
  );
  // Verify pagination records match data length
  TestValidator.equals(
    "pagination records matches data length",
    filteredByAdmin.pagination.records,
    filteredByAdmin.data.length,
  );
  // 4. Test status='active' filter
  const activeAdmins = await api.functional.redditClone.admin.admins.index(
    adminConnection,
    {
      body: {
        status: "active",
        page_size: 100,
      } satisfies IRedditCloneAdmin.IRequest,
    },
  );
  typia.assert(activeAdmins);
  // All created admins should be active (deleted_at is null)
  TestValidator.predicate(
    "all active admins have null deleted_at",
    activeAdmins.data.every((admin) => admin.deleted_at === null),
  );
  // Should have at least 4 active admins
  TestValidator.predicate(
    "at least 4 active admins exist",
    activeAdmins.data.length >= 4,
  );
  // 5. Test status='deleted' filter
  const deletedAdmins = await api.functional.redditClone.admin.admins.index(
    adminConnection,
    {
      body: {
        status: "deleted",
        page_size: 100,
      } satisfies IRedditCloneAdmin.IRequest,
    },
  );
  typia.assert(deletedAdmins);
  // Should have no deleted admins (we haven't deleted any)
  TestValidator.equals("no deleted admins exist", deletedAdmins.data.length, 0);
  TestValidator.equals(
    "deleted pagination records is 0",
    deletedAdmins.pagination.records,
    0,
  );
  // 6. Test with different username pattern that should return empty
  const filteredByNonExistent =
    await api.functional.redditClone.admin.admins.index(adminConnection, {
      body: {
        status: "all",
        username: "nonexistent_pattern_xyz",
        page_size: 100,
      } satisfies IRedditCloneAdmin.IRequest,
    });
  typia.assert(filteredByNonExistent);
  TestValidator.equals(
    "non-existent pattern returns empty results",
    filteredByNonExistent.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent pattern pagination records is 0",
    filteredByNonExistent.pagination.records,
    0,
  );
  // 7. Verify business logic: at least one admin should match the 'admin' pattern
  TestValidator.predicate(
    "primary admin is included in filtered results",
    filteredByAdmin.data.some(
      (admin) => admin.username === primaryAdmin.username,
    ),
  );
}
