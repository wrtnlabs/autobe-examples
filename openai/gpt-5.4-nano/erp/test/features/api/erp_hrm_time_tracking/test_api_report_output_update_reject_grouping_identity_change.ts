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

export async function test_api_report_output_update_reject_grouping_identity_change(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1 satisfies number as number,
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2) Generate a report and obtain persisted outputs
  const reportDefinition = typia.random<IErpHrmTimeTrackingReportDefinition>();
  const generation =
    await api.functional.erpHrmTimeTracking.member.reportDefinitions.generate.generateReport(
      memberConnection,
      { body: reportDefinition },
    );
  typia.assert(generation);
  TestValidator.predicate(
    "should generate at least one output row",
    () => generation.outputs.length > 0,
  );
  const before = generation.outputs[0];
  typia.assert(before);
  // 3) Update notes only (grouping identity fields are not writable)
  const updatedNotes = RandomGenerator.paragraph({ sentences: 2 });
  const updated = await api.functional.erpHrmTimeTracking.reportOutputs.update(
    memberConnection,
    {
      reportOutputId: before.id,
      body: {
        notes: updatedNotes,
      } satisfies IErpHrmTimeTrackingReportOutput.IUpdate,
    },
  );
  typia.assert(updated);
  // 4) Validate immutability using the PUT response
  TestValidator.equals("id unchanged", updated.id, before.id);
  TestValidator.equals(
    "employeeId unchanged",
    updated.employeeId,
    before.employeeId,
  );
  TestValidator.equals(
    "projectId unchanged",
    updated.projectId,
    before.projectId,
  );
  TestValidator.equals("taskId unchanged", updated.taskId, before.taskId);
  TestValidator.equals(
    "weekStartDateId unchanged",
    updated.weekStartDateId,
    before.weekStartDateId,
  );
  TestValidator.equals(
    "groupingSortKey unchanged",
    updated.groupingSortKey,
    before.groupingSortKey,
  );
  TestValidator.equals(
    "reportGenerationRunId unchanged",
    updated.reportGenerationRunId,
    before.reportGenerationRunId,
  );
  TestValidator.equals(
    "createdAt unchanged",
    updated.createdAt,
    before.createdAt,
  );
  TestValidator.equals(
    "deletedAt unchanged",
    updated.deletedAt,
    before.deletedAt,
  );
  TestValidator.equals(
    "employee summary unchanged",
    updated.employee,
    before.employee,
  );
  TestValidator.equals(
    "project summary unchanged",
    updated.project,
    before.project,
  );
  TestValidator.equals("task summary unchanged", updated.task, before.task);
  TestValidator.equals(
    "weekStartDate summary unchanged",
    updated.weekStartDate,
    before.weekStartDate,
  );
  TestValidator.equals("notes updated", updated.notes, updatedNotes);
  // 5) Optional best-effort refetch via re-generation
  // Note: report generation may produce new report output IDs per run.
  // If the same ID is not present, we don't fail; immutability was already validated by the PUT response.
  const generation2 =
    await api.functional.erpHrmTimeTracking.member.reportDefinitions.generate.generateReport(
      memberConnection,
      { body: reportDefinition },
    );
  typia.assert(generation2);
  const after = generation2.outputs.find((o) => o.id === before.id);
  if (after) {
    typia.assert(after);
    TestValidator.equals("id unchanged (refetch)", after.id, before.id);
    TestValidator.equals(
      "employeeId unchanged (refetch)",
      after.employeeId,
      before.employeeId,
    );
    TestValidator.equals(
      "projectId unchanged (refetch)",
      after.projectId,
      before.projectId,
    );
    TestValidator.equals(
      "taskId unchanged (refetch)",
      after.taskId,
      before.taskId,
    );
    TestValidator.equals(
      "weekStartDateId unchanged (refetch)",
      after.weekStartDateId,
      before.weekStartDateId,
    );
    TestValidator.equals(
      "groupingSortKey unchanged (refetch)",
      after.groupingSortKey,
      before.groupingSortKey,
    );
    TestValidator.equals("notes updated (refetch)", after.notes, updatedNotes);
  }
}
