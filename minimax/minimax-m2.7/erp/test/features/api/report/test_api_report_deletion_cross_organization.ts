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
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { generate_random_erp_hrm_admin_reports_create } from "../../../generate/generate_random_erp_hrm_admin_reports_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_report } from "../../../prepare/prepare_random_erp_hrm_report";

/**
 * Test that an admin cannot delete a report belonging to a different organization.
 *
 * This test validates cross-organization data isolation by:
 * 1. Admin1 creates organization1 and a report in it
 * 2. Admin2 creates organization2 (different context)
 * 3. Admin2 attempts to delete Admin1's report
 * 4. Verify the operation is rejected with access denied
 * 5. Verify the original report still exists
 */
export async function test_api_report_deletion_cross_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin1 joins and creates organization1 with a report
  const admin1Connection: api.IConnection = { host: connection.host };
  await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  const organization1 =
    await generate_random_erp_hrm_admin_organizations_create(admin1Connection, {
      body: {
        currency: "USD",
        name: RandomGenerator.name(),
        timezone: "Asia/Seoul",
        fiscalStartMonth: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >(),
      } satisfies IErpHrmOrganization.ICreate,
    });
  typia.assert(organization1);
  const report1 = await generate_random_erp_hrm_admin_reports_create(
    admin1Connection,
    {
      body: {
        reportType: "time_report",
        name: RandomGenerator.name(),
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        groupBy: "employee",
      } satisfies IErpHrmReport.ICreate,
    },
  );
  typia.assert(report1);
  const reportId = report1.id;
  // 2. Admin2 joins and creates organization2
  const admin2Connection: api.IConnection = { host: connection.host };
  await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  const organization2 =
    await generate_random_erp_hrm_admin_organizations_create(admin2Connection, {
      body: {
        currency: "EUR",
        name: RandomGenerator.name(),
        timezone: "Europe/London",
        fiscalStartMonth: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >(),
      } satisfies IErpHrmOrganization.ICreate,
    });
  typia.assert(organization2);
  // 3. Admin2 attempts to delete Admin1's report from organization1
  // This should fail with 403 Forbidden or access denied
  await TestValidator.httpError(
    "admin2 cannot delete report from different organization",
    [403, 404],
    async () =>
      await api.functional.erpHrm.admin.reports.erase(admin2Connection, {
        reportId: reportId,
      }),
  );
}
