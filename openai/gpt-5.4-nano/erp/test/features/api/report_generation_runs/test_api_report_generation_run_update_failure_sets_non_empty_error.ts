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

export async function test_api_report_generation_run_update_failure_sets_non_empty_error(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member join auth context (single member account)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd-12345",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "KRW",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  await authorize_member_join(memberConnection, {
    body: memberCredentials,
  });
  // 2) Create a member organization context
  const organization =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          logo_url: null,
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IErpHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3) Create an active report definition in that organization
  const reportDefinition =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      memberConnection,
      {
        body: {
          code: `code_${RandomGenerator.alphabets(8)}`,
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          report_type: "timesheet",
          is_active: true,
          definitionDimensions: [
            {
              dimension_key: "employee",
              dimension_label: "Employee",
              sort_order: 1,
            },
          ],
          definitionFilters: [
            {
              field_key: "project",
              operator: "equals",
              value_text: "all",
              value_text_2: null,
              is_enabled: true,
              display_order: 1,
            },
          ],
        } satisfies IErpHrmTimeTrackingReportDefinition.ICreate,
      },
    );
  typia.assert(reportDefinition);
  // 4) Create a report generation run
  const reportGenerationRun =
    await generate_random_erp_hrm_time_tracking_report_generation_runs_create(
      memberConnection,
      {
        body: {
          reportDefinitionId: reportDefinition.id,
          parameters: {
            range: "last_30_days",
          },
        } satisfies IErpHrmTimeTrackingReportGenerationRun.ICreate,
      },
    );
  typia.assert(reportGenerationRun);
  const reportGenerationRunId = reportGenerationRun.id;
  const initialReportDefinitionId = reportGenerationRun.reportDefinition.id;
  // 5) Update the run lifecycle to failure
  const startedAt = new Date(Date.now() - 60000).toISOString();
  const finishedAt = new Date(Date.now() - 30000).toISOString();
  const failureStatus = "failed";
  const errorMessage = `Report generation failed: ${RandomGenerator.paragraph({ sentences: 1 })}`;
  const updated =
    await api.functional.erpHrmTimeTracking.reportGenerationRuns.update(
      memberConnection,
      {
        reportGenerationRunId,
        body: {
          status: failureStatus,
          started_at: startedAt,
          finished_at: finishedAt,
          error_message: errorMessage,
        } satisfies IErpHrmTimeTrackingReportGenerationRun.IUpdate,
      },
    );
  typia.assert(updated);
  // 6) Validate
  TestValidator.equals(
    "report generation run status is failure",
    updated.status,
    failureStatus,
  );
  TestValidator.predicate(
    "error message is non-empty",
    updated.error_message !== null && updated.error_message.trim().length > 0,
  );
  TestValidator.predicate(
    "finished_at not earlier than started_at",
    updated.started_at !== null &&
      updated.finished_at !== null &&
      new Date(updated.finished_at).getTime() >=
        new Date(updated.started_at).getTime(),
  );
  TestValidator.equals(
    "reportDefinition association unchanged",
    updated.reportDefinition.id,
    initialReportDefinitionId,
  );
  TestValidator.equals("run id unchanged", updated.id, reportGenerationRunId);
}
