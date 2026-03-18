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

export async function test_api_report_export_successful_run_non_empty_outputs(
  connection: api.IConnection,
): Promise<void> {
  const baseConnection: api.IConnection = { host: connection.host };
  // 1) Authenticate as a member via join
  const memberEmail = typia
    .random<string & tags.Format<"email">>()
    .toLowerCase();
  const password = "Password123!";
  const memberOrganizationName = `${RandomGenerator.alphabets(10)}`;
  const memberAuth: IErpHrmTimeTrackingMember.IAuthorized =
    await authorize_member_join(baseConnection, {
      body: {
        email: memberEmail,
        password,
        organizationName: memberOrganizationName,
        organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
        organizationLogoUrl: null,
        organizationCurrencyCode: "USD",
        organizationTimezone: "Asia/Seoul",
        organizationFiscalStartMonth: 1,
        href: "https://example.com/some-path",
        referrer: "https://example.com/",
        ip: null,
      } satisfies IErpHrmTimeTrackingMember.IJoin,
    });
  typia.assert(memberAuth);
  const memberConnection: api.IConnection = { host: connection.host };
  // authorize_member_join mutates baseConnection headers; reuse same object
  memberConnection.headers = baseConnection.headers;
  // 2) Create tenant organization (generator helper)
  const orgA: IErpHrmTimeTrackingOrganization =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `${memberOrganizationName}-org-${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logo_url: null,
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IErpHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(orgA);
  // 3) Create report definition with dimensions/filters
  const dimension1Key = `dim_${RandomGenerator.alphabets(6)}`;
  const filter1Key = `filter_${RandomGenerator.alphabets(6)}`;
  const reportDefinitionA: IErpHrmTimeTrackingReportDefinition =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      memberConnection,
      {
        body: {
          code: `rpt_${RandomGenerator.alphabets(8)}`,
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          report_type: "default",
          is_active: true,
          definitionDimensions: [
            {
              dimension_key: dimension1Key,
              dimension_label: "Dimension",
              sort_order: 1,
            },
          ] satisfies IErpHrmTimeTrackingReportDefinitionDimension.ICreate[],
          definitionFilters: [
            {
              field_key: filter1Key,
              operator: "equals",
              value_text: "value",
              value_text_2: null,
              is_enabled: true,
              display_order: 1,
            },
          ] satisfies IErpHrmTimeTrackingReportDefinitionFilter.ICreate[],
        } satisfies IErpHrmTimeTrackingReportDefinition.ICreate,
      },
    );
  typia.assert(reportDefinitionA);
  // helper: wait until success terminal
  const pollUntilSuccess = async (
    runId: string & tags.Format<"uuid">,
  ): Promise<IErpHrmTimeTrackingReportGenerationRun> => {
    for (let attempt = 0; attempt < 60; attempt++) {
      const run =
        await api.functional.erpHrmTimeTracking.reportGenerationRuns.at(
          memberConnection,
          { reportGenerationRunId: runId },
        );
      typia.assert(run);
      const terminal =
        run.finished_at !== null &&
        run.started_at !== null &&
        run.status !== "running" &&
        run.status !== "pending";
      if (terminal && run.error_message === null) {
        return run;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    const last =
      await api.functional.erpHrmTimeTracking.reportGenerationRuns.at(
        memberConnection,
        { reportGenerationRunId: runId },
      );
    typia.assert(last);
    throw new Error(
      `Report generation run did not reach successful terminal state: ${last.status} error=${last.error_message}`,
    );
  };
  // 4) Create report generation run A
  const runA =
    await generate_random_erp_hrm_time_tracking_report_generation_runs_create(
      memberConnection,
      {
        body: {
          reportDefinitionId: reportDefinitionA.id,
          parameters: {
            seed: RandomGenerator.alphabets(12),
          },
        } satisfies IErpHrmTimeTrackingReportGenerationRun.ICreate,
      },
    );
  typia.assert(runA);
  // 5) Poll run A
  const runARetrieved = await pollUntilSuccess(runA.id);
  typia.assert(runARetrieved);
  TestValidator.predicate(
    "run A has non-empty outputs",
    runARetrieved.outputs.length > 0,
  );
  // 6) Export run A
  const exportA =
    await api.functional.erpHrmTimeTracking.member.reportGenerationRuns.exports.createExports(
      memberConnection,
      { reportGenerationRunId: runARetrieved.id },
    );
  typia.assert(exportA);
  TestValidator.equals(
    "export A reportGenerationRunId matches run A",
    exportA.reportGenerationRunId,
    runARetrieved.id,
  );
  // 7) Scoping with run B
  const runB =
    await generate_random_erp_hrm_time_tracking_report_generation_runs_create(
      memberConnection,
      {
        body: {
          reportDefinitionId: reportDefinitionA.id,
          parameters: {
            seed: RandomGenerator.alphabets(12),
            variant: RandomGenerator.alphabets(8),
          },
        } satisfies IErpHrmTimeTrackingReportGenerationRun.ICreate,
      },
    );
  typia.assert(runB);
  const runBRetrieved = await pollUntilSuccess(runB.id);
  typia.assert(runBRetrieved);
  const exportB =
    await api.functional.erpHrmTimeTracking.member.reportGenerationRuns.exports.createExports(
      memberConnection,
      { reportGenerationRunId: runBRetrieved.id },
    );
  typia.assert(exportB);
  TestValidator.equals(
    "export B reportGenerationRunId matches run B",
    exportB.reportGenerationRunId,
    runBRetrieved.id,
  );
  const idsA = runARetrieved.outputs.map((o) => o.id);
  const idsB = runBRetrieved.outputs.map((o) => o.id);
  const intersection = idsA.filter((id) => idsB.includes(id));
  TestValidator.predicate(
    "no output row id leakage A->B",
    () => intersection.length === 0,
  );
  // 8) Determinism for same successful run A: re-export and compare ordering of outputs
  await api.functional.erpHrmTimeTracking.member.reportGenerationRuns.exports.createExports(
    memberConnection,
    { reportGenerationRunId: runARetrieved.id },
  );
  const runARetrievedAfter =
    await api.functional.erpHrmTimeTracking.reportGenerationRuns.at(
      memberConnection,
      { reportGenerationRunId: runARetrieved.id },
    );
  typia.assert(runARetrievedAfter);
  const orderKeyA1 = runARetrieved.outputs.map((o) => o.groupingSortKey);
  const orderKeyA2 = runARetrievedAfter.outputs.map((o) => o.groupingSortKey);
  TestValidator.equals(
    "deterministic grouping order for run A",
    orderKeyA2,
    orderKeyA1,
  );
  const idsAfterA = runARetrievedAfter.outputs.map((o) => o.id);
  TestValidator.equals(
    "deterministic output row ordering for run A",
    idsAfterA,
    idsA,
  );
}
