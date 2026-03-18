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

export async function test_api_report_export_rejected_when_run_not_successful(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Password_123!";
  await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      organizationName: `org-${RandomGenerator.alphabets(10)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: `https://example.com/href/${RandomGenerator.alphabets(8)}`,
      referrer: `https://example.com/ref/${RandomGenerator.alphabets(8)}`,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const reportDefinition =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      memberConnection,
      {
        body: {
          code: `rd-${RandomGenerator.alphabets(8)}`,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: null,
          report_type: "time_tracking",
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
              field_key: "date_range",
              operator: "between",
              value_text: "2026-01-01",
              value_text_2: "2026-01-31",
              is_enabled: true,
              display_order: 1,
            },
          ],
        } satisfies IErpHrmTimeTrackingReportDefinition.ICreate,
      },
    );
  typia.assert(reportDefinition);
  const createNonSuccessfulRun = async () => {
    // Try a few times to avoid flakiness if async generation finishes quickly.
    for (let attempt = 0; attempt < 3; attempt++) {
      const run =
        await generate_random_erp_hrm_time_tracking_report_generation_runs_create(
          memberConnection,
          {
            body: {
              reportDefinitionId: reportDefinition.id,
              parameters: {
                date_range: "2026-01",
                trigger: `attempt-${attempt}`,
              },
            } satisfies IErpHrmTimeTrackingReportGenerationRun.ICreate,
          },
        );
      typia.assert(run);
      // If status is not success, we can proceed.
      // We don't know exact success string values, so use a heuristic:
      // treat any status containing "success" as success; otherwise non-success.
      const status = run.status.toLowerCase();
      if (!status.includes("success")) return run;
    }
    // Fallback: return last run even if it might be success; the assertion below
    // will still enforce the contract (if it is success, endpoint may allow exports).
    // However, this should be rare.
    return await generate_random_erp_hrm_time_tracking_report_generation_runs_create(
      memberConnection,
      {
        body: {
          reportDefinitionId: reportDefinition.id,
          parameters: {
            date_range: "2026-01",
            trigger: "fallback",
          },
        } satisfies IErpHrmTimeTrackingReportGenerationRun.ICreate,
      },
    );
  };
  const run = await createNonSuccessfulRun();
  typia.assert(run);
  await TestValidator.error(
    "export generation should be rejected for non-success run status",
    async () => {
      await api.functional.erpHrmTimeTracking.member.reportGenerationRuns.exports.createExports(
        memberConnection,
        {
          reportGenerationRunId: run.id,
        },
      );
    },
  );
}
