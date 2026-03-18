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

export async function test_api_report_generation_run_create_success_scoped_initialization(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member (establish auth)
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "P@ssw0rd-" + RandomGenerator.alphabets(10);
  const organizationName = `org-${RandomGenerator.alphabets(10)}`;
  await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      organizationName,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: RandomGenerator.pick([
        "USD",
        "KRW",
        "EUR",
        "GBP",
        "JPY",
      ]) satisfies string,
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1 satisfies number & tags.Type<"int32">,
      href: `https://example.com/${RandomGenerator.alphabets(6)}`,
      referrer: `https://ref.example.com/${RandomGenerator.alphabets(6)}`,
      ip: undefined,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  // 2) Create a tenant org to set current organization context
  const org =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `tenant-${RandomGenerator.alphabets(12)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logo_url: null,
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<12>,
        },
      },
    );
  typia.assert(org);
  // 3) Create a report definition within the current org context
  const reportDefinition =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      memberConnection,
      {
        body: {
          code: `rpt-${RandomGenerator.alphabets(10)}`,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: null,
          report_type: RandomGenerator.pick([
            "time_tracking_summary",
            "time_tracking_detail",
          ]) satisfies string,
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
              operator: "eq",
              value_text: "p1",
              value_text_2: null,
              is_enabled: true,
              display_order: 1,
            },
          ],
        },
      },
    );
  typia.assert(reportDefinition);
  // 4) Create run for that definition with deterministic parameters
  const parameters = {
    range_start: "2026-01-01",
    range_end: "2026-01-31",
    project_code: "p1",
  };
  const run =
    await generate_random_erp_hrm_time_tracking_report_generation_runs_create(
      memberConnection,
      {
        body: {
          reportDefinitionId: reportDefinition.id,
          parameters,
        },
      },
    );
  typia.assert(run);
  // 5) Validate initialization and scoping invariants from POST response
  TestValidator.predicate("run id is non-empty", run.id.length > 0);
  TestValidator.equals(
    "reportDefinition id matches",
    run.reportDefinition.id,
    reportDefinition.id,
  );
  TestValidator.equals(
    "reportDefinition code matches",
    run.reportDefinition.code,
    reportDefinition.code,
  );
  TestValidator.predicate("status is non-empty", run.status.length > 0);
  TestValidator.equals("error_message is null", run.error_message, null);
  TestValidator.equals(
    "finished_at is null immediately",
    run.finished_at,
    null,
  );
  TestValidator.predicate(
    "parameters_summary is non-empty",
    run.parameters_summary.length > 0,
  );
  // Determinism check: recreate run with same inputs and compare summary
  const run2 =
    await generate_random_erp_hrm_time_tracking_report_generation_runs_create(
      memberConnection,
      {
        body: {
          reportDefinitionId: reportDefinition.id,
          parameters,
        },
      },
    );
  typia.assert(run2);
  TestValidator.equals(
    "parameters_summary is deterministic",
    run2.parameters_summary,
    run.parameters_summary,
  );
  // Ensure org scoping indirectly by verifying reportDefinition reference stays same definition
  TestValidator.equals(
    "reportDefinition id matches on second run",
    run2.reportDefinition.id,
    reportDefinition.id,
  );
  // started_at can be null or non-null; no strict assertion besides type validation via typia.assert
}
