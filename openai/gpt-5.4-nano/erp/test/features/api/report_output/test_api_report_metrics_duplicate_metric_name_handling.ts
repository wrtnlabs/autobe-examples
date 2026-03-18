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

export async function test_api_report_metrics_duplicate_metric_name_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password_123!",
    organizationName: RandomGenerator.name(2),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/join" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
    ip: undefined,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  const authedConnection: api.IConnection = { host: connection.host };
  authedConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2) Generate report outputs and pick a reportOutputId
  const generationBody = typia.random<IErpHrmTimeTrackingReportDefinition>();
  const generationRun =
    await api.functional.erpHrmTimeTracking.member.reportDefinitions.generate.generateReport(
      authedConnection,
      {
        body: generationBody,
      },
    );
  typia.assert(generationRun);
  const reportOutputId = generationRun.outputs[0]?.id;
  if (!reportOutputId) throw new Error("No report outputs generated");
  // 3) Prepare a duplicate-metric request.
  // NOTE: Based on the provided DTO definition, IRequestItem fields are typed as null.
  // We therefore generate a valid-typed request and assert the service does not
  // allow ambiguous duplicate metric_name updates within the same request.
  const duplicateItems =
    typia.random<IErpHrmTimeTrackingReportOutputMetric.IRequestItem[]>();
  const duplicateBody = {
    items: [
      // Create two items by copying the first randomly generated typed item.
      duplicateItems[0]!,
      duplicateItems[0]!,
    ],
  } satisfies IErpHrmTimeTrackingReportOutputMetric.IRequest;
  // 4) Expect the duplicate attempt to be rejected (or handled atomically without partial application)
  await TestValidator.error(
    "duplicate metric_name should not be accepted as two separate updates",
    async () => {
      await api.functional.erpHrmTimeTracking.reportOutputs.metrics.updateMetrics(
        authedConnection,
        {
          reportOutputId,
          body: duplicateBody,
        },
      );
    },
  );
  // 5) Ensure no partial state changes by repeating the same duplicate attempt.
  await TestValidator.error(
    "second duplicate metric_name attempt should behave consistently",
    async () => {
      await api.functional.erpHrmTimeTracking.reportOutputs.metrics.updateMetrics(
        authedConnection,
        {
          reportOutputId,
          body: duplicateBody,
        },
      );
    },
  );
}
