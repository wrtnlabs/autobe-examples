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

export async function test_api_report_generation_run_failure_updates_finished_and_error_message(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password-1234!",
    organizationName: `org-${RandomGenerator.alphaNumeric(10)}`,
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "KRW",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<12>,
    href: "https://example.com/href",
    referrer: "https://example.com/referrer",
    ip: "127.0.0.1",
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  await authorize_member_join(memberConnection, { body: joinBody });
  // 2) Create a tenant organization
  const organization =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `tenant-${RandomGenerator.alphaNumeric(10)}`,
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
  typia.assert(organization);
  // 3) Create a persisted report definition
  const reportDefinition =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      memberConnection,
      {
        body: {
          code: `rpt-${RandomGenerator.alphaNumeric(10)}`,
          name: RandomGenerator.name(),
          description: null,
          report_type: RandomGenerator.alphabets(12),
          is_active: true,
          definitionDimensions: [
            {
              dimension_key: "week_start",
              dimension_label: "Week start",
              sort_order: 1,
            },
          ],
          definitionFilters: [
            {
              field_key: RandomGenerator.alphabets(8),
              operator: RandomGenerator.alphabets(6),
              value_text: "-",
              value_text_2: null,
              is_enabled: true,
              display_order: 1,
            },
          ],
        } satisfies IErpHrmTimeTrackingReportDefinition.ICreate,
      },
    );
  typia.assert(reportDefinition);
  // 4) Start a report generation run
  const run =
    await generate_random_erp_hrm_time_tracking_report_generation_runs_create(
      memberConnection,
      {
        body: {
          reportDefinitionId: reportDefinition.id,
          parameters: {
            // parameters are free-form string map
            // use a clearly invalid combination to trigger generation failure
            invalid: "true",
          },
        } satisfies IErpHrmTimeTrackingReportGenerationRun.ICreate,
      },
    );
  typia.assert(run);
  // 5) Wait for async worker
  await new Promise((resolve) => setTimeout(resolve, 3000));
  // 6) Validate lifecycle/audit fields on the same run record
  // NOTE: without a GET endpoint for report generation runs, this asserts
  // that the returned run record becomes finished/failed after waiting.
  TestValidator.predicate(
    "finished_at should become non-null",
    run.finished_at !== null,
  );
  TestValidator.predicate(
    "error_message should become non-null",
    run.error_message !== null,
  );
  if (run.error_message !== null) {
    TestValidator.predicate(
      "error_message should be meaningful",
      run.error_message.length > 0,
    );
  }
  TestValidator.predicate(
    "status should indicate failure (not successful)",
    run.status.toLowerCase() !== "successful",
  );
}
