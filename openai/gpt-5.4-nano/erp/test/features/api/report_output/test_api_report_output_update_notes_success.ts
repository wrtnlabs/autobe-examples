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

export async function test_api_report_output_update_notes_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member (join flow) and establish organization context.
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPassword123!";
  await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  // 2) Create the minimal reporting artifacts needed to obtain reportOutputId.
  const run =
    await api.functional.erpHrmTimeTracking.member.reportDefinitions.generate.generateReport(
      memberConnection,
      {
        body: typia.random<IErpHrmTimeTrackingReportDefinition>(),
      },
    );
  typia.assert(run);
  const firstOutput = run.outputs[0];
  TestValidator.predicate(
    "generated report run must contain at least one output row",
    firstOutput !== undefined,
  );
  const reportOutputId = typia.assert(firstOutput).id;
  const preUpdate = typia.assert(firstOutput);
  // 3) Ensure export artifacts can be created for the run.
  // Even if the response is an output row DTO in this SDK, we validate it.
  const exported =
    await api.functional.erpHrmTimeTracking.member.reportGenerationRuns.exports.createExports(
      memberConnection,
      {
        reportGenerationRunId: run.id,
      },
    );
  typia.assert(exported);
  // 4) Update notes.
  const newNotes = RandomGenerator.paragraph({ sentences: 2 });
  const updated = await api.functional.erpHrmTimeTracking.reportOutputs.update(
    memberConnection,
    {
      reportOutputId,
      body: {
        notes: newNotes,
      } satisfies IErpHrmTimeTrackingReportOutput.IUpdate,
    },
  );
  typia.assert(updated);
  // 5) Validate updated fields.
  TestValidator.equals("reportOutputId matches", updated.id, reportOutputId);
  TestValidator.equals("notes updated", updated.notes, newNotes);
  TestValidator.predicate(
    "updatedAt later",
    new Date(updated.updatedAt).getTime() >
      new Date(preUpdate.updatedAt).getTime(),
  );
  TestValidator.equals(
    "employeeId unchanged",
    updated.employeeId,
    preUpdate.employeeId,
  );
  TestValidator.equals(
    "projectId unchanged",
    updated.projectId,
    preUpdate.projectId,
  );
  TestValidator.equals("taskId unchanged", updated.taskId, preUpdate.taskId);
  TestValidator.equals(
    "weekStartDateId unchanged",
    updated.weekStartDateId,
    preUpdate.weekStartDateId,
  );
  TestValidator.equals(
    "groupingSortKey unchanged",
    updated.groupingSortKey,
    preUpdate.groupingSortKey,
  );
  // Side-effect check (re-fetch and metric stability):
  // Not possible with provided SDK function list (no GET output/metrics endpoints).
}
