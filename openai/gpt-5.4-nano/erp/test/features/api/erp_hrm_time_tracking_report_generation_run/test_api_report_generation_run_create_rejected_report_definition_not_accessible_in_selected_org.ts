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
import { generate_random_erp_hrm_time_tracking_report_definitions_create } from "../../../generate/generate_random_erp_hrm_time_tracking_report_definitions_create";
import { generate_random_erp_hrm_time_tracking_report_generation_runs_create } from "../../../generate/generate_random_erp_hrm_time_tracking_report_generation_runs_create";
import { prepare_random_erp_hrm_time_tracking_organization } from "../../../prepare/prepare_random_erp_hrm_time_tracking_organization";
import { prepare_random_erp_hrm_time_tracking_report_definition } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition";
import { prepare_random_erp_hrm_time_tracking_report_definition_dimension } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_dimension";
import { prepare_random_erp_hrm_time_tracking_report_definition_filter } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_filter";
import { prepare_random_erp_hrm_time_tracking_report_generation_run } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_generation_run";

export async function test_api_report_generation_run_create_rejected_report_definition_not_accessible_in_selected_org(
  connection: api.IConnection,
): Promise<void> {
  // 1) Create Organization A and member context (join creates initial org; use it as selected org)
  const memberAConnection: api.IConnection = { host: connection.host };
  const password = "Password123!";
  const orgAName = `orgA-${RandomGenerator.alphabets(10)}`;
  const orgADescription = `desc-${RandomGenerator.alphabets(12)}`;
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password,
      organizationName: orgAName,
      organizationDescription: orgADescription,
      organizationCurrencyCode: RandomGenerator.pick([
        "USD",
        "KRW",
        "EUR",
        "JPY",
      ]),
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 3,
      href: `https://example.com/${RandomGenerator.alphabets(8)}`,
      referrer: `https://example.com/ref/${RandomGenerator.alphabets(8)}`,
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const reportDefinitionA =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      memberAConnection,
      {
        body: {
          code: `repA-${RandomGenerator.alphabets(12)}`,
          name: `Report A ${RandomGenerator.alphabets(6)}`,
          description: null,
          report_type: RandomGenerator.pick(["summary", "detailed"]),
          is_active: true,
          definitionDimensions: [],
          definitionFilters: [],
        } satisfies DeepPartial<IErpHrmTimeTrackingReportDefinition.ICreate>,
      },
    );
  typia.assert(reportDefinitionA);
  // 3) Create Organization B and member context (join creates initial org; use it as selected org)
  const memberBConnection: api.IConnection = { host: connection.host };
  const orgBName = `orgB-${RandomGenerator.alphabets(10)}`;
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password,
      organizationName: orgBName,
      organizationDescription: `desc-${RandomGenerator.alphabets(12)}`,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 3,
      href: `https://example.com/${RandomGenerator.alphabets(8)}`,
      referrer: `https://example.com/ref/${RandomGenerator.alphabets(8)}`,
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  // 4) Attempt run creation in Organization B using reportDefinitionId from Org A
  await TestValidator.error(
    "rejected when reportDefinitionId is not accessible in selected organization",
    async () => {
      const run =
        await api.functional.erpHrmTimeTracking.reportGenerationRuns.create(
          memberBConnection,
          {
            body: {
              reportDefinitionId: reportDefinitionA.id,
              parameters: {
                scope: "cross-org",
              },
            } satisfies IErpHrmTimeTrackingReportGenerationRun.ICreate,
          },
        );
      typia.assert(run);
    },
  );
}
