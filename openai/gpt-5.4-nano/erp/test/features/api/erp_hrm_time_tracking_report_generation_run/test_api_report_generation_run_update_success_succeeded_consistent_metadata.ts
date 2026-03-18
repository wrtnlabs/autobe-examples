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

export async function test_api_report_generation_run_update_success_succeeded_consistent_metadata(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member join
  const memberEmail =
    `${RandomGenerator.alphabets(10)}@example.com` satisfies string &
      tags.Format<"email">;
  const password = RandomGenerator.alphabets(12);
  const baseConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(baseConnection, {
    body: {
      email: memberEmail,
      password,
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = baseConnection.headers;
  // 2) Create/select organization
  const organization =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `org-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
          logo_url: null,
        } satisfies IErpHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3) Create active report definition
  const reportDefinition =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      memberConnection,
      {
        body: {
          code: `rd-${RandomGenerator.alphabets(8)}`,
          name: `Report ${RandomGenerator.name(2)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          report_type: "time_tracking_summary",
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
              field_key: "project",
              operator: "eq",
              value_text: "all",
              value_text_2: null,
              is_enabled: true,
              display_order: 1,
            },
          ] satisfies IErpHrmTimeTrackingReportDefinitionFilter.ICreate[],
        } satisfies IErpHrmTimeTrackingReportDefinition.ICreate,
      },
    );
  typia.assert(reportDefinition);
  const originalReportDefinitionId = reportDefinition.id;
  // 4) Create report generation run
  const started = new Date(Date.now() - 60000).toISOString();
  const finished = new Date(Date.now() + 60000).toISOString();
  const run =
    await generate_random_erp_hrm_time_tracking_report_generation_runs_create(
      memberConnection,
      {
        body: {
          reportDefinitionId: reportDefinition.id,
          parameters: {
            range_start: new Date(Date.now() - 86400000).toISOString(),
            range_end: new Date().toISOString(),
          },
        } satisfies IErpHrmTimeTrackingReportGenerationRun.ICreate,
      },
    );
  typia.assert(run);
  const runId = run.id;
  const originalParametersSummary = run.parameters_summary;
  const originalReportDefinition = run.reportDefinition;
  // 5) Update run to succeeded
  const updated =
    await api.functional.erpHrmTimeTracking.reportGenerationRuns.update(
      memberConnection,
      {
        reportGenerationRunId: runId,
        body: {
          status: "succeeded",
          started_at: started,
          finished_at: finished,
          error_message: null,
        } satisfies IErpHrmTimeTrackingReportGenerationRun.IUpdate,
      },
    );
  typia.assert(updated);
  // 6) Validate invariants & consistency
  TestValidator.equals("run id unchanged", updated.id, runId);
  TestValidator.equals(
    "parameters_summary unchanged",
    updated.parameters_summary,
    originalParametersSummary,
  );
  TestValidator.equals(
    "reportDefinition linkage unchanged",
    updated.reportDefinition.id,
    originalReportDefinition.id,
  );
  TestValidator.equals("status set to succeeded", updated.status, "succeeded");
  TestValidator.predicate(
    "finished_at is not earlier than started_at",
    updated.started_at !== null &&
      updated.finished_at !== null &&
      Date.parse(updated.finished_at) >= Date.parse(updated.started_at),
  );
  // allow server normalization by validating equality at millisecond resolution
  TestValidator.equals(
    "started_at matches input (ms)",
    updated.started_at,
    started,
  );
  TestValidator.equals(
    "finished_at matches input (ms)",
    updated.finished_at,
    finished,
  );
  TestValidator.equals("error_message cleared", updated.error_message, null);
  TestValidator.equals(
    "reportDefinition code unchanged",
    updated.reportDefinition.code,
    originalReportDefinition.code,
  );
  TestValidator.equals(
    "reportDefinition organization summary unchanged",
    JSON.stringify(updated.reportDefinition.organization),
    JSON.stringify(originalReportDefinition.organization),
  );
  TestValidator.equals(
    "run reportDefinition matches created reportDefinition",
    updated.reportDefinition.id,
    originalReportDefinitionId,
  );
}
