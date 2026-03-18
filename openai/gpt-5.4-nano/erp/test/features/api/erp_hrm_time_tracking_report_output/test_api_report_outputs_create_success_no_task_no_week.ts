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

export async function test_api_report_outputs_create_success_no_task_no_week(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member (create a new member account)
  const memberConnection: api.IConnection = { host: connection.host };
  const joinPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password-123456!",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/join",
    referrer: "https://example.com/from",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinPayload,
  });
  const tokenConnection: api.IConnection = { host: connection.host };
  tokenConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2) Create a report generation run
  const reportRun =
    await api.functional.erpHrmTimeTracking.member.reportDefinitions.generate.generateReport(
      tokenConnection,
      {
        body: {
          id: typia.random<string & tags.Format<"uuid">>(),
          code: "unused",
          name: "unused",
          description: null,
          report_type: "unused",
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
          organization_id: typia.random<string & tags.Format<"uuid">>(),
          creator_member_id: typia.random<string & tags.Format<"uuid">>(),
          dimensions: true,
          filters: true,
        } satisfies IErpHrmTimeTrackingReportDefinition,
      },
    );
  typia.assert(reportRun);
  const reportGenerationRunId = reportRun.id;
  // 3) Choose employee & project from returned outputs (accessible by definition of run)
  const firstOutput = reportRun.outputs[0];
  typia.assert(firstOutput);
  const employeeId = firstOutput.employeeId;
  const projectId = firstOutput.projectId;
  // 4) Create report output row with no task and no week
  const groupingSortKey = `group-${reportGenerationRunId}-${employeeId}-${projectId}-no-task-no-week`;
  const notes = RandomGenerator.paragraph({ sentences: 2 });
  const created = await api.functional.erpHrmTimeTracking.reportOutputs.create(
    tokenConnection,
    {
      body: {
        report_generation_run_id: reportGenerationRunId,
        employee_id: employeeId,
        project_id: projectId,
        task_id: null,
        week_start_date_id: null,
        grouping_sort_key: groupingSortKey,
        notes,
      } satisfies IErpHrmTimeTrackingReportOutput.ICreate,
    },
  );
  typia.assert(created);
  // 5) Validate response
  TestValidator.equals(
    "reportGenerationRunId matches",
    created.reportGenerationRunId,
    reportGenerationRunId,
  );
  TestValidator.equals("employeeId matches", created.employeeId, employeeId);
  TestValidator.equals("projectId matches", created.projectId, projectId);
  TestValidator.equals("taskId is null", created.taskId, null);
  TestValidator.equals(
    "weekStartDateId is null",
    created.weekStartDateId,
    null,
  );
  TestValidator.equals(
    "groupingSortKey matches",
    created.groupingSortKey,
    groupingSortKey,
  );
  TestValidator.equals("notes matches", created.notes, notes);
  TestValidator.equals("deletedAt is null", created.deletedAt, null);
  TestValidator.predicate("createdAt exists", created.createdAt.length > 0);
  TestValidator.predicate("updatedAt exists", created.updatedAt.length > 0);
}
