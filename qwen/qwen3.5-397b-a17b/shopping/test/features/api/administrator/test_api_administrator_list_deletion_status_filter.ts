import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrator";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test administrator list filtering by deletion status.
 *
 * Validates that super administrators can filter administrator accounts
 * by their deletion status (active vs deleted) using the deleted_at parameter.
 *
 * Test Flow:
 * 1. Authenticate as super administrator
 * 2. Query active administrators (deleted_at=null)
 * 3. Query deleted administrators (deleted_at with date value)
 * 4. Validate filtering correctness and response structure
 */
export async function test_api_administrator_list_deletion_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminAuth = await authorize_super_administrator_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdministrator.IJoin,
  });
  typia.assert(superAdminAuth);
  // 2. Create authenticated connection for super administrator
  const superAdminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${superAdminAuth.token.access}`,
    },
  };
  // 3. Query active administrators (deleted_at=null)
  const activeAdmins =
    await api.functional.shoppingMall.superAdministrator.administrators.index(
      superAdminConnection,
      {
        body: {
          deleted_at: null,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(activeAdmins);
  // 4. Validate active administrators pagination
  TestValidator.equals("current page", activeAdmins.pagination.current, 1);
  TestValidator.equals("page limit", activeAdmins.pagination.limit, 20);
  TestValidator.predicate(
    "records count valid",
    activeAdmins.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count valid",
    activeAdmins.pagination.pages >= 0,
  );
  // 5. Validate all active administrators have deleted_at=null
  for (const admin of activeAdmins.data) {
    TestValidator.equals(
      "active admin deleted_at is null",
      admin.deleted_at,
      null,
    );
  }
  // 6. Query deleted administrators (deleted_at with date value)
  // Using a past date to filter for any deleted administrators
  const deletedAdmins =
    await api.functional.shoppingMall.superAdministrator.administrators.index(
      superAdminConnection,
      {
        body: {
          deleted_at: new Date("2020-01-01T00:00:00.000Z").toISOString(),
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(deletedAdmins);
  // 7. Validate deleted administrators pagination
  TestValidator.equals(
    "deleted current page",
    deletedAdmins.pagination.current,
    1,
  );
  TestValidator.equals(
    "deleted page limit",
    deletedAdmins.pagination.limit,
    20,
  );
  // 8. Validate all deleted administrators have deleted_at as timestamp (not null)
  for (const admin of deletedAdmins.data) {
    TestValidator.predicate(
      "deleted admin has deleted_at timestamp",
      admin.deleted_at !== null,
    );
  }
  // 9. Test without deleted_at filter to get all administrators
  const allAdmins =
    await api.functional.shoppingMall.superAdministrator.administrators.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(allAdmins);
  // 10. Validate pagination metadata consistency
  TestValidator.predicate(
    "total records >= active records",
    allAdmins.pagination.records >= activeAdmins.pagination.records,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    allAdmins.pagination.pages >= 1,
  );
}
