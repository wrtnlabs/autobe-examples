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
import type { IErpHrmTimeTrackingReportOutputMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportOutputMetric";
import type { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingReportOutput } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingReportOutput";
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
import { generate_random_erp_hrm_time_tracking_report_output_metrics_create_report_output_metric } from "../../../generate/generate_random_erp_hrm_time_tracking_report_output_metrics_create_report_output_metric";
import { prepare_random_erp_hrm_time_tracking_organization } from "../../../prepare/prepare_random_erp_hrm_time_tracking_organization";
import { prepare_random_erp_hrm_time_tracking_report_definition } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition";
import { prepare_random_erp_hrm_time_tracking_report_definition_dimension } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_dimension";
import { prepare_random_erp_hrm_time_tracking_report_definition_filter } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_filter";
import { prepare_random_erp_hrm_time_tracking_report_output_metric } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_output_metric";

export async function test_api_report_output_metrics_update_happy_path_and_uniqueness(
  connection: api.IConnection,
): Promise<void> {
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(12);
  const organizationName = `org-${RandomGenerator.alphabets(10)}`;
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      organizationName,
      organizationDescription: "E2E test organization",
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const reportDefinition: IErpHrmTimeTrackingReportDefinition =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      memberConnection,
      {
        body: {
          code: `rd-${RandomGenerator.alphabets(10)}`,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: null,
          report_type: "default",
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
              field_key: "status",
              operator: "eq",
              value_text: "active",
              value_text_2: null,
              is_enabled: true,
              display_order: 1,
            },
          ],
        } satisfies IErpHrmTimeTrackingReportDefinition.ICreate,
      },
    );
  typia.assert(reportDefinition);
  const generationRun =
    await api.functional.erpHrmTimeTracking.member.reportDefinitions.generate.generateReport(
      memberConnection,
      {
        body: reportDefinition,
      },
    );
  typia.assert(generationRun);
  const outputsPage =
    await api.functional.erpHrmTimeTracking.reportGenerationRuns.outputs.index(
      memberConnection,
      {
        reportGenerationRunId: generationRun.id,
        body: {
          employee_id: null,
          project_id: null,
          task_id: null,
          week_start_date_id: null,
          page: 1,
          limit: 50,
          sortBy: null,
          sortDirection: null,
        } satisfies IErpHrmTimeTrackingReportOutput.IRequest,
      },
    );
  typia.assert(outputsPage);
  const firstOutput = outputsPage.data[0];
  TestValidator.predicate(
    "has at least one report output",
    firstOutput !== undefined,
  );
  const parentOutputId = firstOutput.id;
  const metricAName = `metric-${RandomGenerator.alphabets(8)}`;
  const metricBName = `metric-${RandomGenerator.alphabets(8)}`;
  const metricA =
    await generate_random_erp_hrm_time_tracking_report_output_metrics_create_report_output_metric(
      memberConnection,
      {
        body: {
          erp_hrm_time_tracking_report_output_id: parentOutputId,
          metric_name: metricAName,
          metric_value: typia.random<number>(),
        } satisfies IErpHrmTimeTrackingReportOutputMetric.ICreate,
      },
    );
  typia.assert(metricA);
  const metricB =
    await generate_random_erp_hrm_time_tracking_report_output_metrics_create_report_output_metric(
      memberConnection,
      {
        body: {
          erp_hrm_time_tracking_report_output_id: parentOutputId,
          metric_name: metricBName,
          metric_value: typia.random<number>(),
        } satisfies IErpHrmTimeTrackingReportOutputMetric.ICreate,
      },
    );
  typia.assert(metricB);
  // Scenario 1
  const prevUpdatedAtA = metricA.updated_at;
  const nextMetricValueA = typia.random<number>();
  const updatedAValue =
    await api.functional.erpHrmTimeTracking.reportOutputMetrics.update(
      memberConnection,
      {
        reportOutputMetricId: metricA.id,
        body: {
          metric_value: nextMetricValueA,
        } satisfies IErpHrmTimeTrackingReportOutputMetric.IUpdate,
      },
    );
  typia.assert(updatedAValue);
  TestValidator.equals(
    "metric_name unchanged",
    updatedAValue.metric_name,
    metricA.metric_name,
  );
  TestValidator.equals(
    "metric_value updated",
    updatedAValue.metric_value,
    nextMetricValueA,
  );
  TestValidator.equals(
    "parent linkage unchanged",
    updatedAValue.erp_hrm_time_tracking_report_output_id,
    metricA.erp_hrm_time_tracking_report_output_id,
  );
  TestValidator.predicate(
    "updated_at later or equal than previous",
    new Date(updatedAValue.updated_at).getTime() >=
      new Date(prevUpdatedAtA).getTime(),
  );
  // Scenario 2
  const uniqueName = `metric-${RandomGenerator.alphabets(12)}`;
  const nextMetricValueForNameChange = typia.random<number>();
  const prevUpdatedAtAfterValueUpdate = updatedAValue.updated_at;
  const updatedAName =
    await api.functional.erpHrmTimeTracking.reportOutputMetrics.update(
      memberConnection,
      {
        reportOutputMetricId: metricA.id,
        body: {
          metric_name: uniqueName,
          metric_value: nextMetricValueForNameChange,
        } satisfies IErpHrmTimeTrackingReportOutputMetric.IUpdate,
      },
    );
  typia.assert(updatedAName);
  TestValidator.equals(
    "metric_name updated",
    updatedAName.metric_name,
    uniqueName,
  );
  TestValidator.equals(
    "metric_value updated with rename",
    updatedAName.metric_value,
    nextMetricValueForNameChange,
  );
  TestValidator.equals(
    "parent linkage unchanged on rename",
    updatedAName.erp_hrm_time_tracking_report_output_id,
    parentOutputId,
  );
  TestValidator.predicate(
    "updated_at later or equal on rename",
    new Date(updatedAName.updated_at).getTime() >=
      new Date(prevUpdatedAtAfterValueUpdate).getTime(),
  );
  // Scenario 3 duplicate metric_name
  await TestValidator.error(
    "reject duplicate metric_name within same parent",
    async () => {
      await api.functional.erpHrmTimeTracking.reportOutputMetrics.update(
        memberConnection,
        {
          reportOutputMetricId: metricA.id,
          body: {
            metric_name: metricB.metric_name,
          } satisfies IErpHrmTimeTrackingReportOutputMetric.IUpdate,
        },
      );
    },
  );
  // Ensure metricA still has uniqueName by updating its metric_value
  const prevMetricAUniqueName = updatedAName.metric_name;
  const nextMetricAValueAfterRejection = typia.random<number>();
  const postRejectionMetricA =
    await api.functional.erpHrmTimeTracking.reportOutputMetrics.update(
      memberConnection,
      {
        reportOutputMetricId: metricA.id,
        body: {
          metric_value: nextMetricAValueAfterRejection,
        } satisfies IErpHrmTimeTrackingReportOutputMetric.IUpdate,
      },
    );
  typia.assert(postRejectionMetricA);
  TestValidator.equals(
    "metricA name unchanged after duplicate attempt",
    postRejectionMetricA.metric_name,
    prevMetricAUniqueName,
  );
  TestValidator.equals(
    "metricA value updated after duplicate attempt",
    postRejectionMetricA.metric_value,
    nextMetricAValueAfterRejection,
  );
  // Validate metricB remains unchanged name
  const prevMetricBName = metricB.metric_name;
  const nextMetricBValue = typia.random<number>();
  const updatedB =
    await api.functional.erpHrmTimeTracking.reportOutputMetrics.update(
      memberConnection,
      {
        reportOutputMetricId: metricB.id,
        body: {
          metric_value: nextMetricBValue,
        } satisfies IErpHrmTimeTrackingReportOutputMetric.IUpdate,
      },
    );
  typia.assert(updatedB);
  TestValidator.equals(
    "metricB name unchanged after duplicate attempt",
    updatedB.metric_name,
    prevMetricBName,
  );
  TestValidator.equals(
    "metricB value updated",
    updatedB.metric_value,
    nextMetricBValue,
  );
}
