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
import type { IErpHrmTimeTrackingReportOutputMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportOutputMetric";
import type { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_report_output_metrics_create_report_output_metric } from "../../../generate/generate_random_erp_hrm_time_tracking_report_output_metrics_create_report_output_metric";
import { prepare_random_erp_hrm_time_tracking_report_output_metric } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_output_metric";

export async function test_api_report_output_metrics_create_metric_line_uniqueness_and_parent_access(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const organizationName = `org_${RandomGenerator.alphabets(10)}`;
  await authorize_member_join(memberConnection, {
    body: {
      email,
      password: "Password123!",
      organizationName,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
      ip: "127.0.0.1",
    },
  });
  const run =
    await api.functional.erpHrmTimeTracking.member.reportDefinitions.generate.generateReport(
      memberConnection,
      {
        body: typia.random<IErpHrmTimeTrackingReportDefinition>(),
      },
    );
  typia.assert(run);
  const output: IErpHrmTimeTrackingReportOutput =
    run.outputs[0] ??
    (await api.functional.erpHrmTimeTracking.member.reportGenerationRuns.exports.createExports(
      memberConnection,
      { reportGenerationRunId: run.id },
    ));
  typia.assert(output);
  const metricName: string = `metric_${RandomGenerator.alphabets(8)}`;
  const metricValueA = Math.abs(typia.random<number>()) + 1;
  const metricValueB = metricValueA + 1;
  const createdA =
    await api.functional.erpHrmTimeTracking.reportOutputMetrics.createReportOutputMetric(
      memberConnection,
      {
        body: {
          erp_hrm_time_tracking_report_output_id: output.id,
          metric_name: metricName,
          metric_value: metricValueA,
        },
      },
    );
  typia.assert(createdA);
  TestValidator.equals(
    "metric parent id matches",
    createdA.erp_hrm_time_tracking_report_output_id,
    output.id,
  );
  TestValidator.equals("metric name matches", createdA.metric_name, metricName);
  TestValidator.equals(
    "metric value matches",
    createdA.metric_value,
    metricValueA,
  );
  TestValidator.equals("metric not deleted", createdA.deleted_at, null);
  await TestValidator.error(
    "reject duplicate metric_name for same parent",
    async () => {
      await api.functional.erpHrmTimeTracking.reportOutputMetrics.createReportOutputMetric(
        memberConnection,
        {
          body: {
            erp_hrm_time_tracking_report_output_id: output.id,
            metric_name: metricName,
            metric_value: metricValueB,
          },
        },
      );
    },
  );
  await TestValidator.error(
    "reject metric creation with non-existent parent",
    async () => {
      await api.functional.erpHrmTimeTracking.reportOutputMetrics.createReportOutputMetric(
        memberConnection,
        {
          body: {
            erp_hrm_time_tracking_report_output_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            metric_name: `orphan_${RandomGenerator.alphabets(8)}`,
            metric_value: 2,
          },
        },
      );
    },
  );
}
