import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import type { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_reports_create } from "../../../generate/generate_random_erp_hrm_admin_reports_create";
import { prepare_random_erp_hrm_report } from "../../../prepare/prepare_random_erp_hrm_report";

export async function test_api_report_parameter_invalid_group_by_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Create a report with valid groupBy
  const report = await generate_random_erp_hrm_admin_reports_create(
    adminConnection,
    {
      body: {
        reportType: "time_report",
        name: RandomGenerator.name(),
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        groupBy: "employee",
      },
    },
  );
  typia.assert(report);
  const originalGroupBy = report.parameter.group_by;
  TestValidator.equals(
    "original groupBy is employee",
    originalGroupBy,
    "employee",
  );
  // 3. Attempt to update with invalid groupBy value - should be rejected
  await TestValidator.error(
    "invalid groupBy value should be rejected",
    async () => {
      await api.functional.erpHrm.member.reports.parameters.update(
        adminConnection,
        {
          reportId: report.id,
          body: {
            groupBy: "invalid_option" as any,
          } satisfies IErpHrmReportParameter.IUpdate,
        },
      );
    },
  );
  // 4. Verify a valid update works - confirming invalid was rejected
  const validUpdateResult =
    await api.functional.erpHrm.member.reports.parameters.update(
      adminConnection,
      {
        reportId: report.id,
        body: {
          groupBy: "project",
        } satisfies IErpHrmReportParameter.IUpdate,
      },
    );
  typia.assert(validUpdateResult);
  TestValidator.equals(
    "groupBy updated to project after invalid was rejected",
    validUpdateResult.parameter.group_by,
    "project",
  );
}
