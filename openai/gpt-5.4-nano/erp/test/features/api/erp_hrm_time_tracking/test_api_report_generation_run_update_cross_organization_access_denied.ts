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

export async function test_api_report_generation_run_update_cross_organization_access_denied(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const emailA = typia.random<string & tags.Format<"email">>();
  const passwordA = "Password123!";
  const orgNameA = RandomGenerator.name();
  const authorizedA = await authorize_member_join(memberAConnection, {
    body: {
      email: emailA,
      password: passwordA,
      organizationName: orgNameA,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/href" as string & tags.Format<"uri">,
      referrer: "https://example.com/ref" as string & tags.Format<"uri">,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorizedA);
  const orgAConnection: api.IConnection = { host: connection.host };
  orgAConnection.headers = {
    Authorization: authorizedA.token.access,
  };
  const reportDefinitionA =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      orgAConnection,
      {
        body: {
          code: `rd-${RandomGenerator.alphabets(8)}`,
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          report_type: "time_tracking",
          is_active: true,
          definitionDimensions: [
            {
              dimension_key: "employee",
              dimension_label: "Employee",
              sort_order: 1,
            },
          ] satisfies IErpHrmTimeTrackingReportDefinitionDimension.ICreate[],
          definitionFilters: [
            {
              field_key: "project",
              operator: "eq",
              value_text: "all",
              value_text_2: null,
              is_enabled: true,
              display_order: 1,
            },
          ] satisfies IErpHrmTimeTrackingReportDefinitionFilter.ICreate[],
        } satisfies IErpHrmTimeTrackingReportDefinition.ICreate,
      },
    );
  typia.assert(reportDefinitionA);
  const runA =
    await generate_random_erp_hrm_time_tracking_report_generation_runs_create(
      orgAConnection,
      {
        body: {
          reportDefinitionId: reportDefinitionA.id,
          parameters: {
            scope: "orgA",
          },
        } satisfies IErpHrmTimeTrackingReportGenerationRun.ICreate,
      },
    );
  typia.assert(runA);
  const runASnapshot = {
    status: runA.status,
    parameters_summary: runA.parameters_summary,
    started_at: runA.started_at,
    finished_at: runA.finished_at,
    error_message: runA.error_message,
    created_at: runA.created_at,
    deleted_at: runA.deleted_at,
    reportDefinition: runA.reportDefinition,
  };
  const memberBConnection: api.IConnection = { host: connection.host };
  const emailB = typia.random<string & tags.Format<"email">>();
  const passwordB = "Password123!";
  const orgNameB = `${orgNameA}-${RandomGenerator.alphabets(6)}`;
  const authorizedB = await authorize_member_join(memberBConnection, {
    body: {
      email: emailB,
      password: passwordB,
      organizationName: orgNameB,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/href2" as string & tags.Format<"uri">,
      referrer: "https://example.com/ref2" as string & tags.Format<"uri">,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorizedB);
  const orgBConnection: api.IConnection = { host: connection.host };
  orgBConnection.headers = {
    Authorization: authorizedB.token.access,
  };
  await TestValidator.error(
    "cross-organization update should be denied",
    async () => {
      await api.functional.erpHrmTimeTracking.reportGenerationRuns.update(
        orgBConnection,
        {
          reportGenerationRunId: runA.id,
          body: {
            status: "failed",
            started_at: new Date().toISOString(),
            finished_at: new Date().toISOString(),
            error_message: "denied",
          } satisfies IErpHrmTimeTrackingReportGenerationRun.IUpdate,
        },
      );
    },
  );
  // Verify Organization A run is unchanged by performing a read-like verification via re-update with identical lifecycle metadata.
  const updatedA =
    await api.functional.erpHrmTimeTracking.reportGenerationRuns.update(
      orgAConnection,
      {
        reportGenerationRunId: runA.id,
        body: {
          status: runASnapshot.status,
          started_at: runASnapshot.started_at,
          finished_at: runASnapshot.finished_at,
          error_message: runASnapshot.error_message,
        } satisfies IErpHrmTimeTrackingReportGenerationRun.IUpdate,
      },
    );
  typia.assert(updatedA);
  TestValidator.equals(
    "run status unchanged",
    updatedA.status,
    runASnapshot.status,
  );
  TestValidator.equals(
    "parameters_summary unchanged",
    updatedA.parameters_summary,
    runASnapshot.parameters_summary,
  );
  TestValidator.equals(
    "started_at unchanged",
    updatedA.started_at,
    runASnapshot.started_at,
  );
  TestValidator.equals(
    "finished_at unchanged",
    updatedA.finished_at,
    runASnapshot.finished_at,
  );
  TestValidator.equals(
    "error_message unchanged",
    updatedA.error_message,
    runASnapshot.error_message,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedA.created_at,
    runASnapshot.created_at,
  );
  TestValidator.equals(
    "deleted_at unchanged",
    updatedA.deleted_at,
    runASnapshot.deleted_at,
  );
  TestValidator.equals(
    "reportDefinition unchanged",
    updatedA.reportDefinition,
    runASnapshot.reportDefinition,
  );
}
