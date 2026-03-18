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

export async function test_api_report_output_update_notes_clear(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Password123!";
  const organizationName = `org_${RandomGenerator.alphabets(10)}`;
  const organizationDescription = `desc_${RandomGenerator.alphabets(10)}`;
  const organizationCurrencyCode = "USD";
  const organizationTimezone = "Asia/Seoul";
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      organizationName,
      organizationDescription,
      organizationCurrencyCode,
      organizationTimezone,
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: `https://example.com/href/${RandomGenerator.alphabets(8)}` as string &
        tags.Format<"uri">,
      referrer:
        `https://example.com/ref/${RandomGenerator.alphabets(8)}` as string &
          tags.Format<"uri">,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  // 2a) Create report generation run (persisted artifacts)
  const generationRun =
    await api.functional.erpHrmTimeTracking.member.reportDefinitions.generate.generateReport(
      memberConnection,
      {
        body: typia.random<IErpHrmTimeTrackingReportDefinition>(),
      },
    );
  typia.assert(generationRun);
  // 2b) Export the generation run to get concrete report output rows
  const reportOutput =
    await api.functional.erpHrmTimeTracking.member.reportGenerationRuns.exports.createExports(
      memberConnection,
      {
        reportGenerationRunId: generationRun.id,
      },
    );
  typia.assert(reportOutput);
  // 3) Ensure notes is non-null before clearing
  let preClearOutput: IErpHrmTimeTrackingReportOutput = reportOutput;
  if (preClearOutput.notes === null) {
    const setupNotes = RandomGenerator.paragraph({ sentences: 3 });
    preClearOutput =
      await api.functional.erpHrmTimeTracking.reportOutputs.update(
        memberConnection,
        {
          reportOutputId: reportOutput.id,
          body: {
            notes: setupNotes,
          } satisfies IErpHrmTimeTrackingReportOutput.IUpdate,
        },
      );
    typia.assert(preClearOutput);
  }
  const preClearUpdatedAt = preClearOutput.updatedAt;
  // 4) Clear notes
  const cleared = await api.functional.erpHrmTimeTracking.reportOutputs.update(
    memberConnection,
    {
      reportOutputId: reportOutput.id,
      body: { notes: null } satisfies IErpHrmTimeTrackingReportOutput.IUpdate,
    },
  );
  typia.assert(cleared);
  // 5) Validate
  TestValidator.equals(
    "reportOutput id preserved",
    cleared.id,
    preClearOutput.id,
  );
  TestValidator.equals("notes cleared", cleared.notes, null);
  TestValidator.notEquals(
    "updatedAt changed",
    cleared.updatedAt,
    preClearUpdatedAt,
  );
  // grouping identity fields remain unchanged
  TestValidator.equals(
    "employeeId preserved",
    cleared.employeeId,
    preClearOutput.employeeId,
  );
  TestValidator.equals(
    "projectId preserved",
    cleared.projectId,
    preClearOutput.projectId,
  );
  TestValidator.equals(
    "taskId preserved",
    cleared.taskId,
    preClearOutput.taskId,
  );
  TestValidator.equals(
    "weekStartDateId preserved",
    cleared.weekStartDateId,
    preClearOutput.weekStartDateId,
  );
  TestValidator.equals(
    "groupingSortKey preserved",
    cleared.groupingSortKey,
    preClearOutput.groupingSortKey,
  );
}
