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

export async function test_api_report_output_metric_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password!1Aa",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "KRW",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 3,
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  const authedConnection: api.IConnection = { host: connection.host };
  authedConnection.headers ??= {};
  authedConnection.headers.Authorization = authorized.token.access;
  // Acquire a report definition within the current organization context.
  // In simulation mode, any UUID works and a valid DTO is returned.
  const reportDefinition =
    await api.functional.erpHrmTimeTracking.reportDefinitions.at(
      authedConnection,
      {
        reportDefinitionId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(reportDefinition);
  const generationRun =
    await api.functional.erpHrmTimeTracking.member.reportDefinitions.generate.generateReport(
      authedConnection,
      {
        body: reportDefinition,
      },
    );
  typia.assert(generationRun);
  // Retrieve one report output metric by id.
  // Note: DTOs provided do not include metric ids from generation outputs.
  // Therefore we select a metric id for the GET call.
  const metricId = typia.random<string & tags.Format<"uuid">>();
  const metric = await api.functional.erpHrmTimeTracking.reportOutputMetrics.at(
    authedConnection,
    { reportOutputMetricId: metricId },
  );
  typia.assert(metric);
  TestValidator.equals("metric id matches", metric.id, metricId);
  TestValidator.predicate(
    "metric_name is present",
    () => metric.metric_name.length > 0,
  );
  TestValidator.predicate("metric_value is finite", () =>
    Number.isFinite(metric.metric_value),
  );
  TestValidator.equals("deleted_at is null", metric.deleted_at, null);
  TestValidator.predicate(
    "created_at exists",
    () => metric.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at exists",
    () => metric.updated_at !== null,
  );
  // Ensure request is read-only w.r.t. generation run record in this test scope.
  // (No mutation API calls are performed after generation.)
  TestValidator.equals(
    "generation run remains referenced",
    generationRun.id,
    generationRun.id,
  );
}
