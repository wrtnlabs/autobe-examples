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

export async function test_api_report_generation_generate_time_report_success_and_empty_and_invalid_config(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const password = "Passw0rd!";
  const email = typia.random<string & tags.Format<"email">>();
  const joinInput: IErpHrmTimeTrackingMember.IJoin = {
    email,
    password,
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
    organizationCurrencyCode: "KRW",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: `https://example.com/${RandomGenerator.alphabets(8)}`,
    referrer: `https://example.com/${RandomGenerator.alphabets(8)}`,
    ip: "127.0.0.1",
  };
  await authorize_member_join(memberConnection, { body: joinInput });
  // Scenario 1: success generation
  const reportDefinition1: IErpHrmTimeTrackingReportDefinition =
    typia.random<IErpHrmTimeTrackingReportDefinition>();
  const run1 =
    await api.functional.erpHrmTimeTracking.member.reportDefinitions.generate.generateReport(
      memberConnection,
      {
        body: reportDefinition1,
      },
    );
  typia.assert(run1);
  TestValidator.predicate(
    "run1 status indicates success",
    run1.status.toLowerCase().includes("succeed"),
  );
  TestValidator.predicate("run1 has finished_at", run1.finished_at !== null);
  TestValidator.predicate("run1 started_at exists", run1.started_at !== null);
  TestValidator.predicate(
    "run1 parameters_summary is non-empty",
    run1.parameters_summary.length > 0,
  );
  if (run1.outputs.length > 0) {
    const first = run1.outputs[0];
    TestValidator.predicate(
      "output has employeeId",
      first.employeeId.length > 0,
    );
    TestValidator.predicate(
      "output has groupingSortKey",
      first.groupingSortKey.length > 0,
    );
    TestValidator.predicate(
      "output references taskId null or uuid",
      first.taskId === null || first.taskId.length > 0,
    );
  }
  // Scenario 2: empty outputs is allowed (generation still succeeds)
  const reportDefinition2: IErpHrmTimeTrackingReportDefinition =
    typia.random<IErpHrmTimeTrackingReportDefinition>();
  const run2 =
    await api.functional.erpHrmTimeTracking.member.reportDefinitions.generate.generateReport(
      memberConnection,
      {
        body: reportDefinition2,
      },
    );
  typia.assert(run2);
  TestValidator.predicate(
    "run2 status indicates success",
    run2.status.toLowerCase().includes("succeed"),
  );
  TestValidator.predicate("run2 has finished_at", run2.finished_at !== null);
  TestValidator.equals(
    "run2 outputs is array",
    Array.isArray(run2.outputs),
    true,
  );
  // Scenario 3: invalid config should fail
  const reportDefinition3: IErpHrmTimeTrackingReportDefinition =
    typia.random<IErpHrmTimeTrackingReportDefinition>();
  const run3 =
    await api.functional.erpHrmTimeTracking.member.reportDefinitions.generate.generateReport(
      memberConnection,
      {
        body: {
          ...reportDefinition3,
          is_active: false,
        } satisfies IErpHrmTimeTrackingReportDefinition,
      },
    );
  typia.assert(run3);
  TestValidator.predicate(
    "run3 status indicates failure",
    !run3.status.toLowerCase().includes("succeed"),
  );
  TestValidator.predicate(
    "run3 error_message is set on failure",
    run3.error_message !== null && run3.error_message.length > 0,
  );
  TestValidator.equals("run3 outputs empty", run3.outputs.length, 0);
}
