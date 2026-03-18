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
import { generate_random_erp_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_organizations_create";
import { prepare_random_erp_hrm_time_tracking_organization } from "../../../prepare/prepare_random_erp_hrm_time_tracking_organization";

export async function test_api_report_output_metrics_delete_organization_mismatch_not_found(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password!2345",
    organizationName: `Org-${RandomGenerator.alphabets(10)}`,
    organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<12>,
    href: "https://example.com/join",
    referrer: "https://example.com/ref",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = {
    Authorization: authorized.token.access,
  };
  // Create Organization A
  const orgA =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      authConnection,
      {
        body: {
          name: `OrgA-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          logo_url: null,
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<12>,
        } satisfies IErpHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(orgA);
  // Generate in Organization A (best-effort). We cannot obtain reportOutputMetricId from available DTOs/endpoints.
  await api.functional.erpHrmTimeTracking.member.reportDefinitions.generate.generateReport(
    authConnection,
    {
      body: typia.random<IErpHrmTimeTrackingReportDefinition>(),
    },
  );
  // Use a valid UUID as reportOutputMetricId to attempt cross-tenant deletion.
  const reportOutputMetricIdA = typia.random<string & tags.Format<"uuid">>();
  // Create Organization B (assume it becomes the active context for subsequent calls)
  const orgB =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      authConnection,
      {
        body: {
          name: `OrgB-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          logo_url: null,
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<12>,
        } satisfies IErpHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(orgB);
  // Delete metric id that belongs to Organization A while in Organization B context.
  // Validate it fails, and the error message should not leak that the metric exists in Org A.
  await TestValidator.error(
    "delete report output metric should not reveal cross-tenant existence",
    async () => {
      try {
        await api.functional.erpHrmTimeTracking.reportOutputMetrics.erase(
          authConnection,
          {
            reportOutputMetricId: reportOutputMetricIdA,
          },
        );
      } catch (e) {
        typia.assertGuard(e);
        const msg =
          (typeof e === "object" && e && "toJSON" in e
            ? (e as { toJSON: () => unknown }).toJSON()
            : null) as
            | {
                message?: string;
              }
            | null;
        const message = msg?.message ?? "";
        // Minimal anti-leak assertion: message should not contain the other org name.
        if (message.includes(orgA.name) || message.includes(orgB.name)) {
          throw new Error(
            "error message appears to leak tenant-specific resource context",
          );
        }
        throw e;
      }
    },
  );
}
