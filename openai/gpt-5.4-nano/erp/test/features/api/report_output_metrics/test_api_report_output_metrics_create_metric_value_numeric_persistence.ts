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

export async function test_api_report_output_metrics_create_metric_value_numeric_persistence(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Passw0rd!" + RandomGenerator.alphabets(10),
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: typia.random<string>(),
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: "https://example.com/" + RandomGenerator.alphabets(12),
      referrer: "https://example.com/" + RandomGenerator.alphabets(12),
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  // 2) Generate a report generation run to obtain outputs
  const generationRun =
    await api.functional.erpHrmTimeTracking.member.reportDefinitions.generate.generateReport(
      memberConnection,
      {
        body: typia.random<IErpHrmTimeTrackingReportDefinition>(),
      },
    );
  typia.assert(generationRun);
  // Ensure outputs exist
  const parentOutput = generationRun.outputs[0];
  typia.assert(parentOutput);
  // 3) Trigger export generation (scenario dependency)
  await api.functional.erpHrmTimeTracking.member.reportGenerationRuns.exports.createExports(
    memberConnection,
    {
      reportGenerationRunId: generationRun.id,
    },
  );
  // 4) Create metric with a decimal number
  const metricName = "numeric_metric_" + RandomGenerator.alphabets(10);
  const metricValue = 12345.6789;
  const metricCreateBody = {
    erp_hrm_time_tracking_report_output_id: parentOutput.id,
    metric_name: metricName,
    metric_value: metricValue,
  } satisfies IErpHrmTimeTrackingReportOutputMetric.ICreate;
  const createdMetric =
    await api.functional.erpHrmTimeTracking.reportOutputMetrics.createReportOutputMetric(
      memberConnection,
      {
        body: metricCreateBody,
      },
    );
  typia.assert(createdMetric);
  TestValidator.equals(
    "metric_name persisted",
    createdMetric.metric_name,
    metricName,
  );
  TestValidator.predicate(
    "metric_value persisted (within tolerance)",
    Math.abs(createdMetric.metric_value - metricValue) <= 0.000001,
  );
  TestValidator.equals("deleted_at is null", createdMetric.deleted_at, null);
  TestValidator.predicate(
    "created_at present",
    createdMetric.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at present",
    createdMetric.updated_at.length > 0,
  );
  // 5) Duplicate create with same metric_name should be rejected
  await TestValidator.error(
    "duplicate metric_name for same output should reject",
    async () => {
      await api.functional.erpHrmTimeTracking.reportOutputMetrics.createReportOutputMetric(
        memberConnection,
        {
          body: metricCreateBody,
        },
      );
    },
  );
}
