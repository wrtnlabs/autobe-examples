import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPasswordReset";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_password_reset_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection for authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Generate a UUID for an admin that has never requested password reset
  // This simulates querying password reset records for an admin with no reset history
  const nonExistentAdminId = typia.random<string & tags.Format<"uuid">>();
  // 3. Query password reset records with empty request body (default pagination)
  const emptyResponse =
    await api.functional.ecommerceMall.superAdmin.admins.password_resets.index(
      superAdminConnection,
      {
        adminId: nonExistentAdminId,
        body: {} satisfies IEcommerceMallAdminPasswordReset.IRequest,
      },
    );
  typia.assert(emptyResponse);
  // 4. Validate response structure
  // Note: emptyResponse.pagination is IPageIEcommerceMall.IPagination
  // which contains a nested pagination.pagination of type IPage.IPagination
  TestValidator.equals("data array should be empty", emptyResponse.data, []);
  TestValidator.equals(
    "pagination records should be 0",
    emptyResponse.pagination.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    emptyResponse.pagination.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page should be 1",
    emptyResponse.pagination.pagination.current,
    1,
  );
  // 5. Query with explicit pagination parameters
  const withPagination =
    await api.functional.ecommerceMall.superAdmin.admins.password_resets.index(
      superAdminConnection,
      {
        adminId: nonExistentAdminId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminPasswordReset.IRequest,
      },
    );
  typia.assert(withPagination);
  // 6. Validate pagination with explicit parameters
  TestValidator.equals("data array should be empty", withPagination.data, []);
  TestValidator.equals(
    "pagination records should be 0",
    withPagination.pagination.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    withPagination.pagination.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page should match request",
    withPagination.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match request",
    withPagination.pagination.pagination.limit,
    10,
  );
}
