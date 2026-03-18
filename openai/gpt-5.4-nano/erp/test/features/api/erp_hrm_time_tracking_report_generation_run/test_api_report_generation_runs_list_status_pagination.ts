import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
import type { IErpHrmTimeTrackingReportDefinitionDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionDimension";
import type { IErpHrmTimeTrackingReportDefinitionFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionFilter";
import type { IErpHrmTimeTrackingReportGenerationRun } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportGenerationRun";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_report_definitions_create } from "../../../generate/generate_random_erp_hrm_time_tracking_report_definitions_create";
import { prepare_random_erp_hrm_time_tracking_report_definition } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition";
import { prepare_random_erp_hrm_time_tracking_report_definition_dimension } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_dimension";
import { prepare_random_erp_hrm_time_tracking_report_definition_filter } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_filter";

export async function test_api_report_generation_runs_list_status_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com`,
      password: "Passw0rd!",
      organizationName: `org-${RandomGenerator.alphabets(10)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  // Create report definition
  const reportDefinition =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      memberConnection,
      {
        body: {
          code: `rd-${RandomGenerator.alphabets(12)}`,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          report_type: "time_tracking",
          is_active: true,
          definitionDimensions: [
            {
              dimension_key: "employee",
              dimension_label: "Employee",
              sort_order: 1,
            },
            {
              dimension_key: "project",
              dimension_label: "Project",
              sort_order: 2,
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
        },
      },
    );
  typia.assert(reportDefinition);
  const reportDefinitionId = reportDefinition.id;
  // Initiate two runs with different parametersSummary
  const run1 =
    await api.functional.erpHrmTimeTracking.reportDefinitions.reportGenerationRuns.search(
      memberConnection,
      {
        reportDefinitionId: reportDefinitionId,
        body: {
          create: true,
          parametersSummary: `params-A-${RandomGenerator.alphaNumeric(8)}`,
        } satisfies IErpHrmTimeTrackingReportGenerationRun.IRequest,
      },
    );
  typia.assert(run1);
  const run2 =
    await api.functional.erpHrmTimeTracking.reportDefinitions.reportGenerationRuns.search(
      memberConnection,
      {
        reportDefinitionId: reportDefinitionId,
        body: {
          create: true,
          parametersSummary: `params-B-${RandomGenerator.alphaNumeric(8)}`,
        } satisfies IErpHrmTimeTrackingReportGenerationRun.IRequest,
      },
    );
  typia.assert(run2);
  const createdAtFrom = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const createdAtTo = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const statusToFilter = run1.status;
  const listPage1 =
    await api.functional.erpHrmTimeTracking.reportDefinitions.reportGenerationRuns.search(
      memberConnection,
      {
        reportDefinitionId: reportDefinitionId,
        body: {
          create: false,
          status: statusToFilter,
          createdAtFrom: createdAtFrom,
          createdAtTo: createdAtTo,
          page: 1,
          limit: 1,
        } satisfies IErpHrmTimeTrackingReportGenerationRun.IRequest,
      },
    );
  typia.assert(listPage1);
  TestValidator.equals(
    "reportDefinition id matches",
    listPage1.reportDefinition.id,
    reportDefinitionId,
  );
  TestValidator.equals(
    "status matches filter",
    listPage1.status,
    statusToFilter,
  );
  const listPage2 =
    await api.functional.erpHrmTimeTracking.reportDefinitions.reportGenerationRuns.search(
      memberConnection,
      {
        reportDefinitionId: reportDefinitionId,
        body: {
          create: false,
          status: statusToFilter,
          createdAtFrom: createdAtFrom,
          createdAtTo: createdAtTo,
          page: 2,
          limit: 1,
        } satisfies IErpHrmTimeTrackingReportGenerationRun.IRequest,
      },
    );
  typia.assert(listPage2);
  TestValidator.equals(
    "reportDefinition id matches page2",
    listPage2.reportDefinition.id,
    reportDefinitionId,
  );
  TestValidator.equals(
    "status matches filter page2",
    listPage2.status,
    statusToFilter,
  );
  // Pagination disjointness cannot be guaranteed due to single-summary response contract.
  // Instead validate that pagination does not break invariants.
  TestValidator.notEquals(
    "pagination should target different run when possible",
    listPage2.id,
    listPage1.id,
  );
  // Non-existent status: endpoint should either return a summary or reject.
  // We only validate successful response invariants if it returns.
  const noStatus = `no-such-status-${RandomGenerator.alphaNumeric(12)}`;
  await TestValidator.error(
    "no runs with random status should not succeed silently",
    async () => {
      const res =
        await api.functional.erpHrmTimeTracking.reportDefinitions.reportGenerationRuns.search(
          memberConnection,
          {
            reportDefinitionId: reportDefinitionId,
            body: {
              create: false,
              status: noStatus,
              createdAtFrom: createdAtFrom,
              createdAtTo: createdAtTo,
              page: 1,
              limit: 1,
            } satisfies IErpHrmTimeTrackingReportGenerationRun.IRequest,
          },
        );
      typia.assert(res);
      TestValidator.equals("status must match filter", res.status, noStatus);
    },
  );
}
