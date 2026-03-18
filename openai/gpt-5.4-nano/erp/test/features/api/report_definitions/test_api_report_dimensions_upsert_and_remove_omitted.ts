import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
import type { IErpHrmTimeTrackingReportDefinitionDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionDimension";
import type { IErpHrmTimeTrackingReportDefinitionFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionFilter";
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
import { prepare_random_erp_hrm_time_tracking_organization } from "../../../prepare/prepare_random_erp_hrm_time_tracking_organization";
import { prepare_random_erp_hrm_time_tracking_report_definition } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition";
import { prepare_random_erp_hrm_time_tracking_report_definition_dimension } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_dimension";
import { prepare_random_erp_hrm_time_tracking_report_definition_filter } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_filter";

export async function test_api_report_dimensions_upsert_and_remove_omitted(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      organizationName: `org_${RandomGenerator.alphabets(10)}`,
      organizationDescription: `desc_${RandomGenerator.alphabets(10)}`,
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: `https://example.com/${RandomGenerator.alphabets(8)}`,
      referrer: `https://example.com/ref/${RandomGenerator.alphabets(8)}`,
      organizationLogoUrl: null,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(memberAuth);

  const organizationConnection: api.IConnection = { host: connection.host };
  organizationConnection.headers = memberConnection.headers;
  const createdOrganization =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      organizationConnection,
      {
        body: {
          name: `tenant_${RandomGenerator.alphabets(12)}`,
          description: `tenant_desc_${RandomGenerator.alphabets(12)}`,
          logo_url: null,
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(createdOrganization);

  const reportDefinitionConnection: api.IConnection = { host: connection.host };
  reportDefinitionConnection.headers = organizationConnection.headers;

  const createBody = {
    code: `rd_${RandomGenerator.alphabets(10)}`,
    name: `Report_${RandomGenerator.alphabets(8)}`,
    description: null,
    report_type: "time_tracking" as const,
    is_active: true,
    definitionDimensions: [
      {
        dimension_key: "employee" as const,
        dimension_label: "Employee",
        sort_order: 1,
      },
      {
        dimension_key: "project" as const,
        dimension_label: "Project",
        sort_order: 2,
      },
    ] satisfies IErpHrmTimeTrackingReportDefinitionDimension.ICreate[],
    definitionFilters: [
      {
        field_key: "employee" as const,
        operator: "eq" as const,
        value_text: "dummy",
        value_text_2: null,
        is_enabled: true,
        display_order: 1,
      },
    ] satisfies IErpHrmTimeTrackingReportDefinitionFilter.ICreate[],
  } satisfies IErpHrmTimeTrackingReportDefinition.ICreate;

  const createdReportDefinition =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      reportDefinitionConnection,
      { body: createBody },
    );
  typia.assert(createdReportDefinition);

  const reportDefinitionId = createdReportDefinition.id;

  const patchRequest1 = typia.assert<
    IErpHrmTimeTrackingReportDefinitionDimension.IRequest
  >({
    dimensions: [
      {
        dimension_key: "employee" as const,
        dimension_label: "Employee Updated",
        sort_order: 1,
      },
      {
        dimension_key: "task" as const,
        dimension_label: "Task",
        sort_order: 2,
      },
    ],
    page: null,
    limit: null,
  });

  const updatedDimensions1 =
    await api.functional.erpHrmTimeTracking.reportDefinitions.dimensions.updateDimensions(
      reportDefinitionConnection,
      { reportDefinitionId, body: patchRequest1 },
    );
  typia.assert(updatedDimensions1);

  type SummaryShape = {
    items: Array<{ dimension_key: string; dimension_label: string; sort_order: number; deleted_at: string | null }>;
  };

  const dimensions1 = typia.assert(
    (updatedDimensions1 as unknown as SummaryShape).items,
  );

  TestValidator.equals("dimension count", dimensions1.length, 2);
  const activeDimensionKeys1 = dimensions1.map((d) => d.dimension_key);
  TestValidator.equals("dimension keys", activeDimensionKeys1, [
    "employee",
    "task",
  ]);

  const employeeDim1 = dimensions1.find((d) => d.dimension_key === "employee");
  if (!employeeDim1) throw new Error("employee dimension missing");
  TestValidator.equals(
    "employee label updated",
    employeeDim1.dimension_label,
    "Employee Updated",
  );
  TestValidator.equals("employee sort_order", employeeDim1.sort_order, 1);
  TestValidator.predicate(
    "no deleted dimensions",
    dimensions1.every((d) => d.deleted_at === null),
  );

  const patchRequest2 = typia.assert<
    IErpHrmTimeTrackingReportDefinitionDimension.IRequest
  >({
    dimensions: [
      {
        dimension_key: "employee" as const,
        dimension_label: "Employee Updated Again",
        sort_order: 1,
      },
      {
        dimension_key: "task" as const,
        dimension_label: "Task",
        sort_order: 3,
      },
    ],
    page: null,
    limit: null,
  });

  const updatedDimensions2 =
    await api.functional.erpHrmTimeTracking.reportDefinitions.dimensions.updateDimensions(
      reportDefinitionConnection,
      { reportDefinitionId, body: patchRequest2 },
    );
  typia.assert(updatedDimensions2);

  const dimensions2 = typia.assert(
    (updatedDimensions2 as unknown as SummaryShape).items,
  );

  TestValidator.equals("dimension count 2", dimensions2.length, 2);
  TestValidator.equals(
    "dimension keys 2",
    dimensions2.map((d) => d.dimension_key),
    ["employee", "task"],
  );

  const employeeDim2 = dimensions2.find((d) => d.dimension_key === "employee");
  if (!employeeDim2) throw new Error("employee dimension missing 2");
  TestValidator.equals(
    "employee label updated 2",
    employeeDim2.dimension_label,
    "Employee Updated Again",
  );
  TestValidator.equals("employee sort_order 2", employeeDim2.sort_order, 1);

  const taskDim2 = dimensions2.find((d) => d.dimension_key === "task");
  if (!taskDim2) throw new Error("task dimension missing 2");
  TestValidator.equals("task sort_order 2", taskDim2.sort_order, 3);

  TestValidator.predicate(
    "ordered by sort_order",
    dimensions2[0].sort_order < dimensions2[1].sort_order,
  );
  TestValidator.predicate(
    "no deleted dimensions 2",
    dimensions2.every((d) => d.deleted_at === null),
  );
}
