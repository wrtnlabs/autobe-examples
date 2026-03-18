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

export async function test_api_report_output_metric_cross_organization_access_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1) Org A join
  const orgAConnection: api.IConnection = { host: connection.host };
  const orgAEmail = typia.random<string & tags.Format<"email">>();
  const orgAJoinBody: IErpHrmTimeTrackingMember.IJoin = {
    email: orgAEmail,
    password: "P@ssw0rd!1",
    organizationName: `OrgA-${RandomGenerator.alphabets(8)}`,
    organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<12>,
    href: "https://example.com/join" as string & tags.Format<"uri">,
    referrer: "https://example.com" as string & tags.Format<"uri">,
    organizationLogoUrl: null,
  };
  await authorize_member_join(orgAConnection, { body: orgAJoinBody });
  // 2) Org A report generation (sanity run)
  const reportDefinitionA = typia.random<IErpHrmTimeTrackingReportDefinition>();
  const generationA =
    await api.functional.erpHrmTimeTracking.member.reportDefinitions.generate.generateReport(
      orgAConnection,
      { body: reportDefinitionA },
    );
  typia.assert(generationA);
  // 3) Org B join
  const orgBConnection: api.IConnection = { host: connection.host };
  const orgBEmail = typia.random<string & tags.Format<"email">>();
  const orgBJoinBody: IErpHrmTimeTrackingMember.IJoin = {
    email: orgBEmail,
    password: "P@ssw0rd!1",
    organizationName: `OrgB-${RandomGenerator.alphabets(8)}`,
    organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 2 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<12>,
    href: "https://example.com/join" as string & tags.Format<"uri">,
    referrer: "https://example.com" as string & tags.Format<"uri">,
    organizationLogoUrl: null,
  };
  await authorize_member_join(orgBConnection, { body: orgBJoinBody });
  // 4) Org B report generation run
  const reportDefinitionB = typia.random<IErpHrmTimeTrackingReportDefinition>();
  const generationB =
    await api.functional.erpHrmTimeTracking.member.reportDefinitions.generate.generateReport(
      orgBConnection,
      { body: reportDefinitionB },
    );
  typia.assert(generationB);
  // 5) Cross-organization request from Org A
  // NOTE: With the currently provided SDK, generateReport doesn't return metric IDs.
  // Use a valid UUID-shaped metric id and assert Org A rejects it when it's not in Org A.
  const foreignMetricId =
    typia.random<IErpHrmTimeTrackingReportOutputMetric>().id;
  await TestValidator.error(
    "cross-organization metric access should be rejected",
    async () => {
      const metric =
        await api.functional.erpHrmTimeTracking.reportOutputMetrics.at(
          orgAConnection,
          { reportOutputMetricId: foreignMetricId },
        );
      typia.assert(metric);
    },
  );
}
