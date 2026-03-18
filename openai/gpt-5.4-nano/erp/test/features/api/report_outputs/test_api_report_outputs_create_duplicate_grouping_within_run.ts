import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
import type { IErpHrmTimeTrackingReportDefinitionDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionDimension";
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
import { generate_random_erp_hrm_time_tracking_report_outputs_create } from "../../../generate/generate_random_erp_hrm_time_tracking_report_outputs_create";
import { prepare_random_erp_hrm_time_tracking_report_output } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_output";

export async function test_api_report_outputs_create_duplicate_grouping_within_run(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const join = await authorize_member_join(memberConnection, {
    body: {
      email,
      password: "Password!234",
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(join);
  // 2) Create a persisted report generation run
  const run =
    await api.functional.erpHrmTimeTracking.member.reportDefinitions.generate.generateReport(
      memberConnection,
      {
        body: typia.random<IErpHrmTimeTrackingReportDefinition>(),
      },
    );
  typia.assert(run);
  // Ensure we can use a grouping identity where task_id and week_start_date_id are null
  const matchingOutput = run.outputs.find(
    (o) => o.taskId === null && o.weekStartDateId === null,
  );
  await TestValidator.predicate(
    "report generation should include at least one output with taskId and weekStartDateId as null",
    () => matchingOutput !== undefined,
  );
  const safeMatchingOutput = typia.assert(matchingOutput!);
  const employeeId = safeMatchingOutput.employeeId;
  const projectId = safeMatchingOutput.projectId;
  const taskId = safeMatchingOutput.taskId;
  const weekStartDateId = safeMatchingOutput.weekStartDateId;
  const groupingSortKeyA = "grouping_key_A_" + RandomGenerator.alphabets(8);
  const groupingSortKeyB = "grouping_key_B_" + RandomGenerator.alphabets(8);
  // 3) Create first output row
  const createdA = await api.functional.erpHrmTimeTracking.reportOutputs.create(
    memberConnection,
    {
      body: {
        report_generation_run_id: run.id,
        employee_id: employeeId,
        project_id: projectId,
        task_id: taskId,
        week_start_date_id: weekStartDateId,
        grouping_sort_key: groupingSortKeyA,
        notes: "first",
      } satisfies IErpHrmTimeTrackingReportOutput.ICreate,
    },
  );
  typia.assert(createdA);
  // 4) Attempt to create duplicate grouping identity with different non-identity values
  const createdB = await api.functional.erpHrmTimeTracking.reportOutputs.create(
    memberConnection,
    {
      body: {
        report_generation_run_id: run.id,
        employee_id: employeeId,
        project_id: projectId,
        task_id: taskId,
        week_start_date_id: weekStartDateId,
        grouping_sort_key: groupingSortKeyB,
        notes: "second",
      } satisfies IErpHrmTimeTrackingReportOutput.ICreate,
    },
  );
  typia.assert(createdB);
  // 5) Validate de-duplication behavior (same identity should map to the same row)
  TestValidator.equals(
    "should not create new row for same grouping identity",
    createdB.id,
    createdA.id,
  );
  TestValidator.equals(
    "notes should remain from first creation",
    createdB.notes,
    "first",
  );
  TestValidator.equals(
    "grouping_sort_key should remain from first creation",
    createdB.groupingSortKey,
    groupingSortKeyA,
  );
}
