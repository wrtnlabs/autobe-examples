import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
import type { IErpHrmTimeTrackingReportDefinitionDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionDimension";
import type { IErpHrmTimeTrackingReportDefinitionFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionFilter";
import type { IErpHrmTimeTrackingReportGenerationRun } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportGenerationRun";
import type { IErpHrmTimeTrackingReportOutput } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportOutput";
import type { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_organizations_create";
import { generate_random_erp_hrm_time_tracking_report_definitions_create } from "../../../generate/generate_random_erp_hrm_time_tracking_report_definitions_create";
import { generate_random_erp_hrm_time_tracking_report_generation_runs_create } from "../../../generate/generate_random_erp_hrm_time_tracking_report_generation_runs_create";
import { prepare_random_erp_hrm_time_tracking_organization } from "../../../prepare/prepare_random_erp_hrm_time_tracking_organization";
import { prepare_random_erp_hrm_time_tracking_report_definition } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition";
import { prepare_random_erp_hrm_time_tracking_report_definition_dimension } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_dimension";
import { prepare_random_erp_hrm_time_tracking_report_definition_filter } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_filter";
import { prepare_random_erp_hrm_time_tracking_report_generation_run } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_generation_run";

export async function test_api_report_export_successful_run_empty_outputs(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Successful export generation for a successful run expected to produce zero outputs.
   *
   * Note: the provided SDK DTO for createExports returns an
   * IErpHrmTimeTrackingReportOutput, so this test validates that export creation
   * succeeds and that the returned output (if any) is linked to the same run.
   */
  // 1) Authenticate as member and establish organization context
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(userConnection, {
    body: {
      email:
        `${RandomGenerator.alphaNumeric(10)}@example.com` satisfies string &
          tags.Format<"email">,
      password: "Password!123",
      organizationName: `org-${RandomGenerator.alphaNumeric(8)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<12>,
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  // 2) Create report definition
  const reportDefinition =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      userConnection,
      {
        body: {
          code: `rd-${RandomGenerator.alphaNumeric(10)}`,
          name: `Report ${RandomGenerator.alphaNumeric(5)}`,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          report_type: "time_tracking_empty_export",
          is_active: true,
          definitionDimensions: [
            {
              dimension_key: "employee",
              dimension_label: "Employee",
              sort_order: 1,
            },
          ] satisfies IErpHrmTimeTrackingReportDefinitionDimension.ICreate[],
          definitionFilters: [
            {
              field_key: "date_range",
              operator: "future",
              value_text: new Date(
                Date.now() + 1000 * 60 * 60 * 24 * 30,
              ).toISOString(),
              value_text_2: null,
              is_enabled: true,
              display_order: 1,
            },
          ] satisfies IErpHrmTimeTrackingReportDefinitionFilter.ICreate[],
        },
      },
    );
  typia.assert(reportDefinition);
  // 3) Create report generation run expected to produce zero outputs
  const runParameters: Record<string, string> = {
    from: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString(),
    to: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(),
  };
  const reportRun =
    await generate_random_erp_hrm_time_tracking_report_generation_runs_create(
      userConnection,
      {
        body: {
          reportDefinitionId: reportDefinition.id,
          parameters: runParameters,
        },
      },
    );
  typia.assert(reportRun);
  // 4) Poll until terminal success (error_message null and finished_at set)
  const runId = reportRun.id;
  let latestRun: IErpHrmTimeTrackingReportGenerationRun = reportRun;
  for (let i = 0; i < 20; i++) {
    latestRun = await api.functional.erpHrmTimeTracking.reportGenerationRuns.at(
      userConnection,
      { reportGenerationRunId: runId },
    );
    typia.assert(latestRun);
    if (latestRun.finished_at !== null && latestRun.error_message === null) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  TestValidator.predicate(
    "run completed successfully (no error, finished_at set)",
    latestRun.finished_at !== null && latestRun.error_message === null,
  );
  TestValidator.equals(
    "reportDefinition linked",
    latestRun.reportDefinition.id,
    reportDefinition.id,
  );
  // 5) Export creation
  const exported =
    await api.functional.erpHrmTimeTracking.member.reportGenerationRuns.exports.createExports(
      userConnection,
      { reportGenerationRunId: runId },
    );
  typia.assert(exported);
  // 6) Validate association with the same run
  TestValidator.equals(
    "export linked to run",
    exported.reportGenerationRunId,
    runId,
  );
}
