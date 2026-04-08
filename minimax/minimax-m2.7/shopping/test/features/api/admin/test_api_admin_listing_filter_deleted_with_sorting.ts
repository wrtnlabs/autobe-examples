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

export async function test_api_admin_listing_filter_deleted_with_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Get deleted admins with sorting by name ascending
  const deletedAdminsResponse =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          status: "deleted",
          sortBy: "name",
          sort: "asc",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(deletedAdminsResponse);
  // 3. Validate all returned admins have non-null deleted_at
  for (const admin of deletedAdminsResponse.data) {
    TestValidator.predicate(
      "admin should have deleted_at",
      admin.deleted_at !== null && admin.deleted_at !== undefined,
    );
  }
  // 4. Verify results are sorted by name in ascending order
  if (deletedAdminsResponse.data.length > 1) {
    for (let i = 1; i < deletedAdminsResponse.data.length; i++) {
      const current = deletedAdminsResponse.data[i];
      const previous = deletedAdminsResponse.data[i - 1];
      TestValidator.predicate(
        "names should be in ascending order",
        current.name.localeCompare(previous.name) >= 0,
      );
    }
  }
  // 5. Validate pagination metadata
  TestValidator.equals(
    "current page should be 1",
    deletedAdminsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 10",
    deletedAdminsResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records count should be non-negative",
    deletedAdminsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count should be non-negative",
    deletedAdminsResponse.pagination.pages >= 0,
  );
  // 6. Test date range filters combined with status filter
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const filteredResponse =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          status: "deleted",
          createdAfter: thirtyDaysAgo.toISOString(),
          createdBefore: now.toISOString(),
          sortBy: "name",
          sort: "asc",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(filteredResponse);
  // All results should still have deleted_at
  for (const admin of filteredResponse.data) {
    TestValidator.predicate(
      "filtered admin should have deleted_at",
      admin.deleted_at !== null && admin.deleted_at !== undefined,
    );
  }
}
