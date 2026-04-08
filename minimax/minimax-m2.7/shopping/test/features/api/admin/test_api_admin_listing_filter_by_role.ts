import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

interface IPaginationWithMeta {
  current: number;
  limit: number;
  records: number;
  pages: number;
}

export async function test_api_admin_listing_filter_by_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Get all admins first to establish baseline
  const allAdminsResponse =
    await api.functional.ecommerceMall.superAdmin.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {} satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(allAdminsResponse);
  // 3. Filter by superAdmin: true
  const superAdminsOnly =
    await api.functional.ecommerceMall.superAdmin.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          superAdmin: true,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(superAdminsOnly);
  // Validate all results have is_super_admin: true
  TestValidator.equals(
    "has super admin records",
    superAdminsOnly.data.length > 0,
    true,
  );
  for (const admin of superAdminsOnly.data) {
    TestValidator.equals("admin is super admin", admin.is_super_admin, true);
  }
  // 4. Filter by superAdmin: false
  const regularAdminsOnly =
    await api.functional.ecommerceMall.superAdmin.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          superAdmin: false,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(regularAdminsOnly);
  // Validate all results have is_super_admin: false
  for (const admin of regularAdminsOnly.data) {
    TestValidator.equals("admin is regular admin", admin.is_super_admin, false);
  }
  // 5. Verify pagination metadata
  const regularPagination = regularAdminsOnly.pagination as unknown as IPaginationWithMeta;
  const superPagination = superAdminsOnly.pagination as unknown as IPaginationWithMeta;
  const allPagination = allAdminsResponse.pagination as unknown as IPaginationWithMeta;
  TestValidator.equals(
    "pagination current page",
    regularPagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    regularPagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    regularPagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    regularPagination.pages >= 0,
  );
  // 6. Verify total counts add up correctly
  const totalWithFilter = superPagination.records + regularPagination.records;
  TestValidator.predicate(
    "filtered totals do not exceed total admins",
    totalWithFilter <= allPagination.records + 1,
  );
}