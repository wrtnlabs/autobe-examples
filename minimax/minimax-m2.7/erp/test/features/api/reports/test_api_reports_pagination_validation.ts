import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_reports_pagination_validation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin via POST /erpHrm/auth/admin/join
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  typia.assert(authorized);
  // Step 2: Call PATCH /erpHrm/admin/reports with page=1, limit=10
  const page1Limit10 = await api.functional.erpHrm.admin.reports.index(
    adminConnection,
    {
      body: {
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        limit: 10,
      } satisfies IErpHrmReport.IRequest,
    },
  );
  typia.assert(page1Limit10);
  // Step 3: Validate pagination metadata for first page
  TestValidator.equals(
    "page 1 current equals 1",
    page1Limit10.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit equals 10",
    page1Limit10.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page 1 records >= 0",
    page1Limit10.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages >= 0",
    page1Limit10.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page 1 data length <= limit",
    page1Limit10.data.length <= 10,
  );
  // Step 4: Call with page=2, limit=10 - verify subsequent page
  const page2Limit10 = await api.functional.erpHrm.admin.reports.index(
    adminConnection,
    {
      body: {
        page: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10,
      } satisfies IErpHrmReport.IRequest,
    },
  );
  typia.assert(page2Limit10);
  // Validate pagination metadata for second page
  TestValidator.equals(
    "page 2 current equals 2",
    page2Limit10.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit equals 10",
    page2Limit10.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page 2 pages >= 2",
    page2Limit10.pagination.pages >= 2,
  );
  // Step 5: Call with page=3 (beyond available pages) - verify empty data
  const page3Limit10 = await api.functional.erpHrm.admin.reports.index(
    adminConnection,
    {
      body: {
        page: 3 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10,
      } satisfies IErpHrmReport.IRequest,
    },
  );
  typia.assert(page3Limit10);
  // Validate empty page returns empty data array
  TestValidator.equals(
    "page 3 current equals 3",
    page3Limit10.pagination.current,
    3,
  );
  TestValidator.equals(
    "page 3 data is empty array",
    page3Limit10.data.length,
    0,
  );
  // Step 6: Test limit=100 (maximum allowed boundary)
  const page1Limit100 = await api.functional.erpHrm.admin.reports.index(
    adminConnection,
    {
      body: {
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 100 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IErpHrmReport.IRequest,
    },
  );
  typia.assert(page1Limit100);
  // Validate maximum limit works correctly
  TestValidator.equals(
    "max limit page current equals 1",
    page1Limit100.pagination.current,
    1,
  );
  TestValidator.equals(
    "max limit equals 100",
    page1Limit100.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit page data length <= 100",
    page1Limit100.data.length <= 100,
  );
}
