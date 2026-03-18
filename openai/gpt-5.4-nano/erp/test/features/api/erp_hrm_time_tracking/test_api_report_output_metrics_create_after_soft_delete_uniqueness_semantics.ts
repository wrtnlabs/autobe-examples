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

export async function test_api_report_output_metrics_create_after_soft_delete_uniqueness_semantics(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Passw0rd!";
  const joinInput = {
    email,
    password,
    organizationName: `${RandomGenerator.name()} Org`,
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "KRW",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/href",
    referrer: "https://example.com/referrer",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authConnection, {
    body: joinInput,
  });
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = authConnection.headers;
  const reportDefinition = typia.random<IErpHrmTimeTrackingReportDefinition>();
  const generationRun =
    await api.functional.erpHrmTimeTracking.member.reportDefinitions.generate.generateReport(
      memberConnection,
      {
        body: reportDefinition,
      },
    );
  typia.assert(generationRun);
  const output =
    generationRun.outputs.length > 0 ? generationRun.outputs[0] : null;
  TestValidator.predicate(
    "has at least one generated report output",
    () => output !== null,
  );
  const reportOutputId = output!.id;
  const metricName = "billable_hours";
  const metricValue1 = typia.random<number>();
  const createdMetric1 =
    await api.functional.erpHrmTimeTracking.reportOutputMetrics.createReportOutputMetric(
      memberConnection,
      {
        body: {
          erp_hrm_time_tracking_report_output_id: reportOutputId,
          metric_name: metricName,
          metric_value: metricValue1,
        } satisfies IErpHrmTimeTrackingReportOutputMetric.ICreate,
      },
    );
  typia.assert(createdMetric1);
  const metricId1 = createdMetric1.id;
  await api.functional.erpHrmTimeTracking.reportOutputMetrics.erase(
    memberConnection,
    {
      reportOutputMetricId: metricId1,
    },
  );
  await TestValidator.error(
    "deleted metric id should not be retrievable",
    async () => {
      const afterDelete =
        await api.functional.erpHrmTimeTracking.reportOutputMetrics.at(
          memberConnection,
          {
            reportOutputMetricId: metricId1,
          },
        );
      typia.assert(afterDelete);
    },
  );
  const metricValue2 = metricValue1 + 1;
  let createdMetric2: IErpHrmTimeTrackingReportOutputMetric | null = null;
  let createSecondFailed = false;
  try {
    createdMetric2 =
      await api.functional.erpHrmTimeTracking.reportOutputMetrics.createReportOutputMetric(
        memberConnection,
        {
          body: {
            erp_hrm_time_tracking_report_output_id: reportOutputId,
            metric_name: metricName,
            metric_value: metricValue2,
          } satisfies IErpHrmTimeTrackingReportOutputMetric.ICreate,
        },
      );
    typia.assert(createdMetric2);
  } catch {
    createSecondFailed = true;
  }
  if (createdMetric2) {
    const metricId2 = createdMetric2.id;
    typia.assert(createdMetric2);
    TestValidator.notEquals(
      "new metric id should differ after re-create",
      metricId1,
      metricId2,
    );
    TestValidator.equals(
      "re-created metric name",
      createdMetric2.metric_name,
      metricName,
    );
    TestValidator.equals(
      "re-created metric parent",
      createdMetric2.erp_hrm_time_tracking_report_output_id,
      reportOutputId,
    );
    const fetchedMetric2 =
      await api.functional.erpHrmTimeTracking.reportOutputMetrics.at(
        memberConnection,
        {
          reportOutputMetricId: metricId2,
        },
      );
    typia.assert(fetchedMetric2);
    TestValidator.equals(
      "fetched second metric id",
      fetchedMetric2.id,
      metricId2,
    );
    TestValidator.equals(
      "second metric should be active (deleted_at null)",
      fetchedMetric2.deleted_at,
      null,
    );
  } else {
    TestValidator.predicate(
      "second create should fail when uniqueness blocks soft-deleted rows",
      () => createSecondFailed,
    );
  }
}
