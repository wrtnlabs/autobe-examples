import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_list_including_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(superAdmin);
  TestValidator.equals(
    "super admin authenticated",
    superAdmin.email.length > 0,
    true,
  );
  TestValidator.equals(
    "super admin has token",
    !!superAdmin.token.access,
    true,
  );
  // 2. Create two additional super admin accounts for testing
  const secondAdminConnection: api.IConnection = { host: connection.host };
  const secondAdmin = await authorize_super_admin_join(
    secondAdminConnection,
    {},
  );
  typia.assert(secondAdmin);
  const thirdAdminConnection: api.IConnection = { host: connection.host };
  const thirdAdmin = await authorize_super_admin_join(thirdAdminConnection, {});
  typia.assert(thirdAdmin);
  // 3. Query with includeDeleted: false (default) - verify only active accounts
  const activeOnlyResult =
    await api.functional.ecommerceMall.superAdmin.super_admin.super_admins.index(
      superAdminConnection,
      {
        body: {
          includeDeleted: false,
        },
      },
    );
  typia.assert(activeOnlyResult);
  // Verify pagination structure
  TestValidator.equals(
    "active-only has pagination",
    !!activeOnlyResult.pagination,
    true,
  );
  TestValidator.predicate(
    "pagination current >= 1",
    activeOnlyResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    activeOnlyResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= 3",
    activeOnlyResult.pagination.records >= 3,
  );
  // Verify all returned accounts are active (isDeleted: false)
  for (const account of activeOnlyResult.data) {
    TestValidator.equals("account is active", account.isDeleted, false);
  }
  // 4. Query with includeDeleted: true - verify all accounts included
  const includeDeletedResult =
    await api.functional.ecommerceMall.superAdmin.super_admin.super_admins.index(
      superAdminConnection,
      {
        body: {
          includeDeleted: true,
        },
      },
    );
  typia.assert(includeDeletedResult);
  // Verify includes all accounts
  TestValidator.predicate(
    "includeDeleted returns at least 3 accounts",
    includeDeletedResult.data.length >= 3,
  );
  // 5. Query with status: "active" - verify only active accounts returned
  const statusActiveResult =
    await api.functional.ecommerceMall.superAdmin.super_admin.super_admins.index(
      superAdminConnection,
      {
        body: {
          status: "active",
        },
      },
    );
  typia.assert(statusActiveResult);
  // Verify all returned accounts are active
  for (const account of statusActiveResult.data) {
    TestValidator.equals(
      "status:active returns active accounts",
      account.isDeleted,
      false,
    );
  }
  // 6. Query with status: "deleted" - verify deleted accounts returned
  const statusDeletedResult =
    await api.functional.ecommerceMall.superAdmin.super_admin.super_admins.index(
      superAdminConnection,
      {
        body: {
          status: "deleted",
        },
      },
    );
  typia.assert(statusDeletedResult);
  // Verify all returned accounts are deleted
  for (const account of statusDeletedResult.data) {
    TestValidator.equals(
      "status:deleted returns deleted accounts",
      account.isDeleted,
      true,
    );
  }
  // 7. Test pagination with includeDeleted: true
  const paginatedResult =
    await api.functional.ecommerceMall.superAdmin.super_admin.super_admins.index(
      superAdminConnection,
      {
        body: {
          includeDeleted: true,
          limit: 2,
          page: 1,
        },
      },
    );
  typia.assert(paginatedResult);
  // Verify pagination works correctly
  TestValidator.equals(
    "pagination limit is 2",
    paginatedResult.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination page is 1",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "data length <= limit",
    paginatedResult.data.length <= 2,
  );
  // 8. Validate ISummary structure including isDeleted field
  for (const account of paginatedResult.data) {
    TestValidator.equals("account has id", typeof account.id, "string");
    TestValidator.equals("account has email", typeof account.email, "string");
    TestValidator.equals(
      "account has createdAt",
      typeof account.createdAt,
      "string",
    );
    TestValidator.equals(
      "account has updatedAt",
      typeof account.updatedAt,
      "string",
    );
    TestValidator.equals(
      "account has isDeleted",
      typeof account.isDeleted,
      "boolean",
    );
    TestValidator.equals(
      "isDeleted is false for active",
      account.isDeleted,
      false,
    );
  }
  // 9. Test email filtering with includeDeleted
  const emailFilteredResult =
    await api.functional.ecommerceMall.superAdmin.super_admin.super_admins.index(
      superAdminConnection,
      {
        body: {
          email: superAdmin.email.substring(0, 5),
          includeDeleted: true,
        },
      },
    );
  typia.assert(emailFilteredResult);
  TestValidator.predicate(
    "email filter returns matching accounts",
    emailFilteredResult.data.length >= 1,
  );
  for (const account of emailFilteredResult.data) {
    TestValidator.predicate(
      "email contains filter substring",
      account.email
        .toLowerCase()
        .includes(superAdmin.email.substring(0, 5).toLowerCase()),
    );
  }
}
