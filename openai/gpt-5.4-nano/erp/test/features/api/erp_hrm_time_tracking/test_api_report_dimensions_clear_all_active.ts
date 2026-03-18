import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
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
import { generate_random_erp_hrm_time_tracking_report_definitions_create } from "../../../generate/generate_random_erp_hrm_time_tracking_report_definitions_create";
import { prepare_random_erp_hrm_time_tracking_report_definition } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition";
import { prepare_random_erp_hrm_time_tracking_report_definition_dimension } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_dimension";
import { prepare_random_erp_hrm_time_tracking_report_definition_filter } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_filter";

export async function test_api_report_dimensions_clear_all_active(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const password = "TestPassword-123!";
  const organizationName = `org_${RandomGenerator.alphabets(10)}`;
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password,
      organizationName,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: randint(1, 12) as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<12>,
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  // 2) Create a report definition with at least 3 dimensions
  const dimensionsCreate = [
    {
      dimension_key: `employee_${RandomGenerator.alphabets(6)}`,
      dimension_label: `Employee_${RandomGenerator.alphabets(6)}`,
      sort_order: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    },
    {
      dimension_key: `project_${RandomGenerator.alphabets(6)}`,
      dimension_label: `Project_${RandomGenerator.alphabets(6)}`,
      sort_order: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    },
    {
      dimension_key: `task_${RandomGenerator.alphabets(6)}`,
      dimension_label: `Task_${RandomGenerator.alphabets(6)}`,
      sort_order: 3 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    },
  ] satisfies IErpHrmTimeTrackingReportDefinitionDimension.ICreate[];
  const filtersCreate =
    [] satisfies IErpHrmTimeTrackingReportDefinitionFilter.ICreate[];
  const reportDefinition =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      memberConnection,
      {
        body: {
          code: `rd_${RandomGenerator.alphabets(12)}`,
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: null,
          report_type: "time_tracking",
          is_active: true,
          definitionDimensions: dimensionsCreate,
          definitionFilters: filtersCreate,
        },
      },
    );
  typia.assert(reportDefinition);
  const reportDefinitionId = reportDefinition.id;
  // 3) PATCH with empty dimensions (clears active)
  const clearResponse =
    await api.functional.erpHrmTimeTracking.reportDefinitions.dimensions.updateDimensions(
      memberConnection,
      {
        reportDefinitionId,
        body: {
          dimensions: [],
          page: null,
          limit: null,
        },
      },
    );
  typia.assert(clearResponse);
  // Response type is a single ISummary; validate it is a valid active dimension summary.
  TestValidator.predicate(
    "cleared response has sort_order >= 1",
    clearResponse.sort_order >= 1,
  );
  TestValidator.equals(
    "cleared response deleted_at is null",
    clearResponse.deleted_at,
    null,
  );
  // 4) PATCH again with a subset
  const subsetSortOrder = 7 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const subsetDimension = {
    dimension_key: true satisfies boolean,
    dimension_label: true satisfies boolean,
    sort_order: subsetSortOrder as unknown as boolean,
  } satisfies IErpHrmTimeTrackingReportDefinitionDimension.IRequestDimension;
  const subsetResponse =
    await api.functional.erpHrmTimeTracking.reportDefinitions.dimensions.updateDimensions(
      memberConnection,
      {
        reportDefinitionId,
        body: {
          dimensions: [subsetDimension],
          page: null,
          limit: null,
        },
      },
    );
  typia.assert(subsetResponse);
  TestValidator.equals(
    "re-added response sort_order matches request",
    subsetResponse.sort_order,
    subsetSortOrder,
  );
  TestValidator.equals(
    "re-added response deleted_at is null",
    subsetResponse.deleted_at,
    null,
  );
}
