import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrator";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test filtering administrators by grade level and account status.
 *
 * Validates the administrator filtering functionality by testing various filter combinations including grade level (regular vs super) and account status (active, banned, deleted). Ensures that the filtering logic correctly returns only administrators matching the specified criteria.
 *
 * The test authenticates as a super administrator, then performs multiple filtered queries to verify that the filtering mechanism works correctly for each filter type. This includes testing grade-based filtering, status-based filtering, and combined filters.
 *
 * 1. Super administrator authenticates using join endpoint.
 * 2. Filter by grade='regular' and status='active' - validates all returned admins have regular grade and active status.
 * 3. Filter by grade='super' - validates only super administrators are returned.
 * 4. Filter by status='banned' - validates only banned administrators are returned.
 * 5. Validates pagination metadata is correctly returned for each query.
 */
export async function test_api_administrator_filter_by_grade_and_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  // 2. Test filter: grade='regular' and status='active'
  const regularActiveResult =
    await api.functional.shoppingMall.superAdmin.administrators.index(
      superAdminConnection,
      {
        body: {
          grade: "regular",
          status: "active",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(regularActiveResult);
  // Validate all returned administrators have regular grade
  for (const admin of regularActiveResult.data) {
    TestValidator.equals("admin grade is regular", admin.grade, "regular");
    TestValidator.predicate(
      "member status is active",
      admin.member.status === "active",
    );
  }
  // Validate pagination metadata
  TestValidator.predicate(
    "current page is 1",
    regularActiveResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is 10",
    regularActiveResult.pagination.limit === 10,
  );
  // 3. Test filter: grade='super'
  const superResult =
    await api.functional.shoppingMall.superAdmin.administrators.index(
      superAdminConnection,
      {
        body: {
          grade: "super",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(superResult);
  // Validate all returned administrators have super grade
  for (const admin of superResult.data) {
    TestValidator.equals("admin grade is super", admin.grade, "super");
  }
  // 4. Test filter: status='banned'
  const bannedResult =
    await api.functional.shoppingMall.superAdmin.administrators.index(
      superAdminConnection,
      {
        body: {
          status: "banned",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(bannedResult);
  // Validate all returned administrators have banned status
  for (const admin of bannedResult.data) {
    TestValidator.predicate(
      "member status is banned",
      admin.member.status === "banned",
    );
  }
  // 5. Test filter: status='deleted'
  const deletedResult =
    await api.functional.shoppingMall.superAdmin.administrators.index(
      superAdminConnection,
      {
        body: {
          status: "deleted",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(deletedResult);
  // Validate all returned administrators have deleted status
  for (const admin of deletedResult.data) {
    TestValidator.predicate(
      "member status is deleted",
      admin.member.status === "deleted",
    );
  }
  // 6. Test with no filters (should return all administrators)
  const allResult =
    await api.functional.shoppingMall.superAdmin.administrators.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(allResult);
  // Validate pagination structure
  TestValidator.predicate(
    "has pagination data",
    allResult.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(allResult.data));
}
