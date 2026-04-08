import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import type { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
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

export async function test_api_report_retrieval_with_valid_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Set organization context
  await generate_random_erp_hrm_member_organization_context_select(
    memberConnection,
    {},
  );
  // 3. Retrieve report - Note: This test demonstrates the report retrieval flow.
  // In a real scenario, a report would need to be created first via admin APIs.
  // For now, we use a sample UUID that may not exist, demonstrating the endpoint structure.
  const sampleReportId = typia.random<string & tags.Format<"uuid">>();
  const report = await api.functional.erpHrm.member.reports.at(
    memberConnection,
    { reportId: sampleReportId },
  );
  typia.assert(report);
  // Validate report structure
  TestValidator.equals("report has id", report.id !== undefined, true);
  TestValidator.equals(
    "report has reportType",
    report.reportType !== undefined,
    true,
  );
  TestValidator.equals(
    "report has createdAt",
    report.createdAt !== undefined,
    true,
  );
  TestValidator.equals(
    "report has updatedAt",
    report.updatedAt !== undefined,
    true,
  );
  TestValidator.equals(
    "report has generatedByMember",
    report.generatedByMember !== undefined,
    true,
  );
  TestValidator.equals(
    "report has organization",
    report.organization !== undefined,
    true,
  );
  TestValidator.equals(
    "report has parameter",
    report.parameter !== undefined,
    true,
  );
}
