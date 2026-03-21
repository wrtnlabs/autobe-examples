import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import type { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
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
import { generate_random_erp_hrm_admin_organizations_reports_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_reports_create";
import { prepare_random_erp_hrm_report } from "../../../prepare/prepare_random_erp_hrm_report";
import { prepare_random_erp_hrm_report_parameter } from "../../../prepare/prepare_random_erp_hrm_report_parameter";

export async function test_api_report_pagination_and_sorting_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  typia.assert(authorized);
  // Create actor-specific connection with token
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = { ...adminConnection.headers };
  // 2. Create multiple reports to test pagination (at least 15 for meaningful pagination)
  const createdReports: IErpHrmReport[] = [];
  // Get organizationId from admin's context - we'll use the first report's organization
  let organizationId: (string & typia.tags.Format<"uuid">) | null = null;
  for (let i = 0; i < 15; i++) {
    const report =
      await generate_random_erp_hrm_admin_organizations_reports_create(
        authenticatedConnection,
        {
          params: {
            organizationId:
              organizationId ??
              (typia.random<string & typia.tags.Format<"uuid">>() as string &
                typia.tags.Format<"uuid">),
          },
        },
      );
    typia.assert(report);
    createdReports.push(report);
    // Capture organizationId from first report
    if (organizationId === null) {
      organizationId = report.organization.id;
    }
  }
  // 3. Request first page with limit=10 and verify pagination metadata
  const page1 = await api.functional.erpHrm.admin.organizations.reports.index(
    authenticatedConnection,
    {
      organizationId: organizationId!,
      body: {
        page: 1,
        limit: 10,
      } satisfies IErpHrmReport.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals(
    "total records >= 15",
    page1.pagination.records >= 15,
    true,
  );
  TestValidator.equals("limit is 10", page1.pagination.limit, 10);
  TestValidator.predicate("page 1 data count <= 10", page1.data.length <= 10);
  // 4. Request page=2 with limit=5 and verify different records are returned
  const page2 = await api.functional.erpHrm.admin.organizations.reports.index(
    authenticatedConnection,
    {
      organizationId: organizationId!,
      body: {
        page: 2,
        limit: 5,
      } satisfies IErpHrmReport.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("limit is 5", page2.pagination.limit, 5);
  TestValidator.equals("current page is 2", page2.pagination.current, 2);
  TestValidator.predicate("page 2 data count <= 5", page2.data.length <= 5);
  // 5. Verify sorting order - all results must have created_at in descending order (newest entries appear first)
  if (page1.data.length >= 2) {
    for (let i = 0; i < page1.data.length - 1; i++) {
      const current = new Date(page1.data[i]!.created_at).getTime();
      const next = new Date(page1.data[i + 1]!.created_at).getTime();
      TestValidator.predicate(
        `page1 record ${i} created_at >= record ${i + 1} created_at`,
        current >= next,
      );
    }
  }
  // 6. Test boundary conditions - limit=1 to verify single record returns correctly
  const singlePage =
    await api.functional.erpHrm.admin.organizations.reports.index(
      authenticatedConnection,
      {
        organizationId: organizationId!,
        body: {
          page: 1,
          limit: 1,
        } satisfies IErpHrmReport.IRequest,
      },
    );
  typia.assert(singlePage);
  TestValidator.equals(
    "single page limit is 1",
    singlePage.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "single page has at most 1 record",
    singlePage.data.length <= 1,
  );
  // 7. Test limit=100 (maximum allowed) to verify large page sizes work
  const maxPage = await api.functional.erpHrm.admin.organizations.reports.index(
    authenticatedConnection,
    {
      organizationId: organizationId!,
      body: {
        page: 1,
        limit: 100,
      } satisfies IErpHrmReport.IRequest,
    },
  );
  typia.assert(maxPage);
  TestValidator.equals("max page limit is 100", maxPage.pagination.limit, 100);
  TestValidator.predicate(
    "max page records >= 15",
    maxPage.pagination.records >= 15,
  );
  // 8. Verify the pagination metadata accurately reflects the data
  const pages = Math.ceil(page1.pagination.records / page1.pagination.limit);
  TestValidator.equals(
    "calculated pages matches pagination pages",
    page1.pagination.pages,
    pages,
  );
  // 9. Verify empty result set returns correct pagination structure with records=0 and pages=0
  const emptyPage =
    await api.functional.erpHrm.admin.organizations.reports.index(
      authenticatedConnection,
      {
        organizationId: organizationId!,
        body: {
          report_type: "non_existent_report_type_xyz",
        } satisfies IErpHrmReport.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty page records is 0",
    emptyPage.pagination.records,
    0,
  );
  TestValidator.equals("empty page pages is 0", emptyPage.pagination.pages, 0);
  TestValidator.predicate(
    "empty page has no data",
    emptyPage.data.length === 0,
  );
}