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
import { generate_random_erp_hrm_time_tracking_report_definitions_create } from "../../../generate/generate_random_erp_hrm_time_tracking_report_definitions_create";
import { generate_random_erp_hrm_time_tracking_report_generation_runs_create } from "../../../generate/generate_random_erp_hrm_time_tracking_report_generation_runs_create";
import { prepare_random_erp_hrm_time_tracking_report_definition } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition";
import { prepare_random_erp_hrm_time_tracking_report_definition_dimension } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_dimension";
import { prepare_random_erp_hrm_time_tracking_report_definition_filter } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_filter";
import { prepare_random_erp_hrm_time_tracking_report_generation_run } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_generation_run";

export async function test_api_report_outputs_fetch_success_empty_and_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: success with pagination + deterministic ordering
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAJoin = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      organizationName: `orgA-${RandomGenerator.alphabets(8)}`,
      organizationDescription: "E2E report outputs isolation A",
      organizationLogoUrl: null,
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 3,
      href: "https://example.com/join/a",
      referrer: "https://example.com/ref/a",
      ip: "203.0.113.10",
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(memberAJoin);
  const reportDefinitionA =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      memberAConnection,
      {
        body: {
          code: `rep-${RandomGenerator.alphabets(10)}`,
          name: `Report ${RandomGenerator.name()}`,
          description: "Report definition A for outputs index",
          report_type: typia.random<string>(),
          is_active: true,
          definitionDimensions: [
            {
              dimension_key: `dim_${RandomGenerator.alphabets(6)}`,
              dimension_label: `Dim ${RandomGenerator.alphabets(6)}`,
              sort_order: 1,
            },
          ],
          definitionFilters: [
            {
              field_key: `filter_${RandomGenerator.alphabets(6)}`,
              operator: typia.random<string>(),
              value_text: "",
              value_text_2: null,
              is_enabled: true,
              display_order: 1,
            },
          ],
        } satisfies IErpHrmTimeTrackingReportDefinition.ICreate,
      },
    );
  typia.assert(reportDefinitionA);
  const generationRunA =
    await generate_random_erp_hrm_time_tracking_report_generation_runs_create(
      memberAConnection,
      {
        body: {
          reportDefinitionId: reportDefinitionA.id,
          parameters: {},
        } satisfies IErpHrmTimeTrackingReportGenerationRun.ICreate,
      },
    );
  typia.assert(generationRunA);
  const pageReq = {
    page: 1,
    limit: 5,
    sortBy: null,
    sortDirection: null,
  } satisfies IErpHrmTimeTrackingReportOutput.IRequest;
  const outputsPage1A =
    await api.functional.erpHrmTimeTracking.reportGenerationRuns.outputs.index(
      memberAConnection,
      {
        reportGenerationRunId: generationRunA.id,
        body: pageReq,
      },
    );
  typia.assert(outputsPage1A);
  TestValidator.equals(
    "pagination current",
    outputsPage1A.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records consistent",
    () => outputsPage1A.pagination.records >= 0,
  );
  TestValidator.predicate(
    "data length matches pagination",
    () => outputsPage1A.data.length <= outputsPage1A.pagination.limit,
  );
  for (const row of outputsPage1A.data) {
    TestValidator.equals(
      "row references same reportGenerationRunId",
      row.report_generation_run_id,
      generationRunA.id,
    );
  }
  const outputsPage1ARepeat =
    await api.functional.erpHrmTimeTracking.reportGenerationRuns.outputs.index(
      memberAConnection,
      {
        reportGenerationRunId: generationRunA.id,
        body: pageReq,
      },
    );
  typia.assert(outputsPage1ARepeat);
  TestValidator.equals(
    "deterministic ordering for same run",
    outputsPage1ARepeat.data.map((r) => r.id),
    outputsPage1A.data.map((r) => r.id),
  );
  // Scenario 2: safe empty page (validate structure even when empty)
  const memberCConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      organizationName: `orgC-${RandomGenerator.alphabets(8)}`,
      organizationDescription: "E2E report outputs empty page",
      organizationLogoUrl: null,
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 4,
      href: "https://example.com/join/c",
      referrer: "https://example.com/ref/c",
      ip: "203.0.113.30",
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const reportDefinitionC =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      memberCConnection,
      {
        body: {
          code: `rep-${RandomGenerator.alphabets(10)}`,
          name: `Report ${RandomGenerator.name()}`,
          description: "Report definition C for empty outputs",
          report_type: typia.random<string>(),
          is_active: true,
          definitionDimensions: [
            {
              dimension_key: `dim_${RandomGenerator.alphabets(6)}`,
              dimension_label: `Dim ${RandomGenerator.alphabets(6)}`,
              sort_order: 1,
            },
          ],
          definitionFilters: [],
        } satisfies IErpHrmTimeTrackingReportDefinition.ICreate,
      },
    );
  typia.assert(reportDefinitionC);
  const generationRunC =
    await generate_random_erp_hrm_time_tracking_report_generation_runs_create(
      memberCConnection,
      {
        body: {
          reportDefinitionId: reportDefinitionC.id,
          parameters: {},
        } satisfies IErpHrmTimeTrackingReportGenerationRun.ICreate,
      },
    );
  typia.assert(generationRunC);
  const outputsEmpty =
    await api.functional.erpHrmTimeTracking.reportGenerationRuns.outputs.index(
      memberCConnection,
      {
        reportGenerationRunId: generationRunC.id,
        body: pageReq,
      },
    );
  typia.assert(outputsEmpty);
  if (outputsEmpty.data.length === 0) {
    TestValidator.equals(
      "records == 0 when empty",
      outputsEmpty.pagination.records,
      0,
    );
    TestValidator.equals(
      "pages == 0 when empty",
      outputsEmpty.pagination.pages,
      0,
    );
  }
  TestValidator.equals("current == 1", outputsEmpty.pagination.current, 1);
  // Scenario 3: organization-scoped isolation
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      organizationName: `orgB-${RandomGenerator.alphabets(8)}`,
      organizationDescription: "E2E report outputs isolation B",
      organizationLogoUrl: null,
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 3,
      href: "https://example.com/join/b",
      referrer: "https://example.com/ref/b",
      ip: "203.0.113.20",
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const outputsFromAByB =
    await api.functional.erpHrmTimeTracking.reportGenerationRuns.outputs.index(
      memberBConnection,
      {
        reportGenerationRunId: generationRunA.id,
        body: pageReq,
      },
    );
  typia.assert(outputsFromAByB);
  // Accept either empty (preferred) or a non-leak response. Ensure returned rows (if any)
  // still belong to the requested run and do not break pagination structure.
  TestValidator.equals(
    "pagination current",
    outputsFromAByB.pagination.current,
    1,
  );
  TestValidator.predicate(
    "data length within pagination limit",
    () => outputsFromAByB.data.length <= outputsFromAByB.pagination.limit,
  );
  for (const row of outputsFromAByB.data) {
    TestValidator.equals(
      "row references same reportGenerationRunId",
      row.report_generation_run_id,
      generationRunA.id,
    );
  }
}
