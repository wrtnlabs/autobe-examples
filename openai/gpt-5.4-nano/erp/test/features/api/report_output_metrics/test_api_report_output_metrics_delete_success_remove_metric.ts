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
import { generate_random_erp_hrm_time_tracking_report_generation_runs_create } from "../../../generate/generate_random_erp_hrm_time_tracking_report_generation_runs_create";
import { prepare_random_erp_hrm_time_tracking_report_generation_run } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_generation_run";

export async function test_api_report_output_metrics_delete_success_remove_metric(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member authentication (join) to obtain authorization context
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody: IErpHrmTimeTrackingMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password!234567",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/" + RandomGenerator.alphabets(10),
    referrer: "https://example.com/ref/" + RandomGenerator.alphabets(10),
    ip: null,
  };
  const authorized = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // 2) Create report generation run
  const run =
    await generate_random_erp_hrm_time_tracking_report_generation_runs_create(
      memberConnection,
      {},
    );
  typia.assert(run);
  // 3) Retrieve outputs for the run and pick an output that likely has metrics
  const outputsPage =
    await api.functional.erpHrmTimeTracking.reportGenerationRuns.outputs.index(
      memberConnection,
      {
        reportGenerationRunId: run.id,
        body: {
          page: 1,
          limit: 50,
          sortBy: null,
          sortDirection: null,
          employee_id: null,
          project_id: null,
          task_id: null,
          week_start_date_id: null,
        },
      },
    );
  typia.assert(outputsPage);
  const outputs = outputsPage.data;
  TestValidator.predicate(
    "there should be at least one generated report output row",
    outputs.length > 0,
  );
  const targetOutput: IErpHrmTimeTrackingReportOutput.ISummary = outputs[0]!;
  // 4) Delete one report output metric.
  // Note: metric list endpoint isn't provided in prompt; we still attempt
  // deletion by deriving an existing metric id indirectly isn't possible.
  // We must select a metric id from existing metric data. Since none is available,
  // call erase with a known metric id by creating a metric is impossible with given APIs.
  // Therefore we attempt to locate by using output DTO request type only - but metrics are not included.
  // This test will fail to delete a real metric without metric retrieval.
  throw new Error(
    "Unable to select a real reportOutputMetricId: metric retrieval endpoint is missing from provided SDK/utilities.",
  );
}
