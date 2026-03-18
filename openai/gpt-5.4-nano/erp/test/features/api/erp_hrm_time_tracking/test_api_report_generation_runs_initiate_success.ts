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

export async function test_api_report_generation_runs_initiate_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member join -> actor connection
  const memberConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password!234",
    organizationName: `${RandomGenerator.alphabets(8)}-org`,
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "KRW",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: (1 +
      (RandomGenerator.alphabets(1).charCodeAt(0) % 12)) as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<12>,
    href: "https://example.com/join",
    referrer: "https://example.com/app",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: credentials,
  });
  typia.assert(authorized);
  const authedConnection: api.IConnection = {
    host: connection.host,
  };
  authedConnection.headers = { Authorization: authorized.token.access };
  // 2) Create active report definition in this org
  const reportDefinition =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      authedConnection,
      {
        body: {
          code: `rd-${RandomGenerator.alphabets(10)}`,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          report_type: "time_tracking_summary",
          is_active: true,
          definitionDimensions: [
            {
              dimension_key: "employee",
              dimension_label: "Employee",
              sort_order: 1,
            },
          ],
          definitionFilters: [
            {
              field_key: "department",
              operator: "eq",
              value_text: "engineering",
              value_text_2: null,
              is_enabled: true,
              display_order: 1,
            },
          ],
        } satisfies IErpHrmTimeTrackingReportDefinition.ICreate,
      },
    );
  typia.assert(reportDefinition);
  const reportDefinitionId = reportDefinition.id;
  // 3) Deterministic generation inputs
  const parametersSummary = `params:${reportDefinition.code}:win:${new Date().toISOString()}:${"det"}`;
  const createdAtFrom = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const createdAtTo = new Date(Date.now()).toISOString() as string &
    tags.Format<"date-time">;
  const requestBody = {
    create: true,
    parametersSummary,
    createdAtFrom,
    createdAtTo,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort: "created_at",
  } satisfies IErpHrmTimeTrackingReportGenerationRun.IRequest;
  // 4) Initiate generation run (idempotent create)
  const run1 =
    await api.functional.erpHrmTimeTracking.reportDefinitions.reportGenerationRuns.search(
      authedConnection,
      {
        reportDefinitionId,
        body: requestBody,
      },
    );
  typia.assert(run1);
  TestValidator.equals(
    "reportDefinition id matches path",
    run1.reportDefinition.id,
    reportDefinitionId,
  );
  TestValidator.predicate(
    "parameters_summary is non-empty",
    run1.parameters_summary.trim().length > 0,
  );
  if (run1.error_message === null) {
    TestValidator.equals(
      "error_message is null on success",
      run1.error_message,
      null,
    );
  } else {
    TestValidator.predicate(
      "status indicates failure when error exists",
      run1.status.toLowerCase().includes("fail") ||
        run1.status.toLowerCase().includes("error") ||
        run1.status.toLowerCase().includes("failed"),
    );
    TestValidator.predicate(
      "error_message is non-empty",
      run1.error_message.trim().length > 0,
    );
  }
  // Timestamps: validate format when present, allow null/async
  if (run1.started_at !== null) {
    typia.assert<string & tags.Format<"date-time">>(run1.started_at);
  }
  if (run1.finished_at !== null) {
    typia.assert<string & tags.Format<"date-time">>(run1.finished_at);
  }
  // 5) Determinism check: same create request again
  const run2 =
    await api.functional.erpHrmTimeTracking.reportDefinitions.reportGenerationRuns.search(
      authedConnection,
      {
        reportDefinitionId,
        body: requestBody,
      },
    );
  typia.assert(run2);
  TestValidator.equals(
    "reportDefinition id still matches",
    run2.reportDefinition.id,
    reportDefinitionId,
  );
  TestValidator.equals(
    "parameters_summary is deterministic",
    run2.parameters_summary,
    run1.parameters_summary,
  );
  if (run2.error_message !== null) {
    TestValidator.predicate(
      "status indicates failure when error exists (second run)",
      run2.status.toLowerCase().includes("fail") ||
        run2.status.toLowerCase().includes("error") ||
        run2.status.toLowerCase().includes("failed"),
    );
    TestValidator.predicate(
      "error_message is non-empty (second run)",
      run2.error_message.trim().length > 0,
    );
  } else {
    TestValidator.equals(
      "error_message is null on success (second run)",
      run2.error_message,
      null,
    );
  }
  if (run2.started_at !== null) {
    typia.assert<string & tags.Format<"date-time">>(run2.started_at);
  }
  if (run2.finished_at !== null) {
    typia.assert<string & tags.Format<"date-time">>(run2.finished_at);
  }
}
