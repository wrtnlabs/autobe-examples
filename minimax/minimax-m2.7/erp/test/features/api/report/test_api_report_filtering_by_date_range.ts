import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";

export async function test_api_report_filtering_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Set organization context
  const organizationContext =
    await generate_random_erp_hrm_member_organization_context_select(
      memberConnection,
      {},
    );
  typia.assert(organizationContext);
  // 3. Calculate date range for filtering (30 days ago to today)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startDate = thirtyDaysAgo.toISOString();
  const endDate = now.toISOString();
  // 4. Query reports with date range filter
  const reportsResponse = await api.functional.erpHrm.member.reports.index(
    memberConnection,
    {
      body: {
        startDate: startDate as string & tags.Format<"date-time">,
        endDate: endDate as string & tags.Format<"date-time">,
      } satisfies IErpHrmReport.IRequest,
    },
  );
  typia.assert(reportsResponse);
  // 5. Validate response structure
  TestValidator.equals(
    "pagination exists",
    reportsResponse.pagination !== null,
    true,
  );
  TestValidator.predicate("data is array", Array.isArray(reportsResponse.data));
  // 6. Test pagination combined with date filtering (page 1 with limit 5)
  const paginatedResponse = await api.functional.erpHrm.member.reports.index(
    memberConnection,
    {
      body: {
        startDate: startDate as string & tags.Format<"date-time">,
        endDate: endDate as string & tags.Format<"date-time">,
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 5 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IErpHrmReport.IRequest,
    },
  );
  typia.assert(paginatedResponse);
  // 7. Validate pagination with filters
  TestValidator.equals(
    "current page is 1",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit is 5", paginatedResponse.pagination.limit, 5);
  TestValidator.predicate(
    "data length <= 5",
    paginatedResponse.data.length <= 5,
  );
  TestValidator.predicate(
    "all reports have valid id",
    reportsResponse.data.every((r) => r.id),
  );
  TestValidator.predicate(
    "all reports have valid reportType",
    reportsResponse.data.every(
      (r) =>
        r.reportType === "time_report" ||
        r.reportType === "project_budget_report" ||
        r.reportType === "weekly_summary_report",
    ),
  );
  TestValidator.predicate(
    "all reports have valid createdAt",
    reportsResponse.data.every((r) => r.createdAt),
  );
}
