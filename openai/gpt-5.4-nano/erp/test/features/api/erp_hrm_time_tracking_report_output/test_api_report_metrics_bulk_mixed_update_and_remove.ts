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

export async function test_api_report_metrics_bulk_mixed_update_and_remove(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!234",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "KRW",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/join",
    referrer: "https://example.com/",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  await authorize_member_join(memberConnection, { body: joinBody });
  // 2) Generate a report to obtain a reportOutputId
  const generation =
    await api.functional.erpHrmTimeTracking.member.reportDefinitions.generate.generateReport(
      memberConnection,
      {
        body: typia.random<IErpHrmTimeTrackingReportDefinition>(),
      },
    );
  typia.assert(generation);
  const output = generation.outputs[0];
  TestValidator.predicate("has report output", () => output !== undefined);
  const reportOutputId = output.id;
  // 3) Prepare bulk request
  const requestBody = {
    items: [
      {
        metric_name: null,
        remove: null,
      },
      {
        metric_name: null,
        remove: null,
      },
    ],
  } satisfies IErpHrmTimeTrackingReportOutputMetric.IRequest;
  // 3-1) First PATCH
  const updated1 =
    await api.functional.erpHrmTimeTracking.reportOutputs.metrics.updateMetrics(
      memberConnection,
      {
        reportOutputId,
        body: requestBody,
      },
    );
  typia.assert(updated1);
  // 3-2) Second PATCH (idempotency)
  const updated2 =
    await api.functional.erpHrmTimeTracking.reportOutputs.metrics.updateMetrics(
      memberConnection,
      {
        reportOutputId,
        body: requestBody,
      },
    );
  typia.assert(updated2);
  TestValidator.equals(
    "metric name stable across idempotent call",
    updated1.metric_name,
    updated2.metric_name,
  );
  TestValidator.equals(
    "metric_value stable across idempotent call",
    updated1.metric_value,
    updated2.metric_value,
  );
  TestValidator.equals(
    "deleted_at stable for idempotent remove",
    updated1.deleted_at,
    updated2.deleted_at,
  );
}
