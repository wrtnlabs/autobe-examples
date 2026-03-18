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
import { generate_random_erp_hrm_time_tracking_report_definitions_dimensions_create_report_definition_dimension } from "../../../generate/generate_random_erp_hrm_time_tracking_report_definitions_dimensions_create_report_definition_dimension";
import { prepare_random_erp_hrm_time_tracking_report_definition } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition";
import { prepare_random_erp_hrm_time_tracking_report_definition_dimension } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_dimension";
import { prepare_random_erp_hrm_time_tracking_report_definition_filter } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_filter";

export async function test_api_report_definition_dimensions_create_first_dimension_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member join to establish organization context
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Password123!";
  const organizationName = `org_${RandomGenerator.alphabets(8)}`;
  const organizationDescription = `desc_${RandomGenerator.alphabets(10)}`;
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      organizationName,
      organizationDescription,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: `https://example.com/href/${RandomGenerator.alphabets(10)}`,
      referrer: `https://example.com/ref/${RandomGenerator.alphabets(10)}`,
      organizationLogoUrl: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  // 2) Create report definition in same organization
  const reportCode = `rd_${RandomGenerator.alphabets(10)}`;
  const reportName = `Report ${RandomGenerator.name(2)}`;
  const reportType = `rt_${RandomGenerator.alphabets(12)}`;
  const createdReport =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      memberConnection,
      {
        body: {
          code: reportCode,
          name: reportName,
          description: null,
          report_type: reportType,
          is_active: true,
          definitionDimensions: [],
          definitionFilters: [],
        } satisfies IErpHrmTimeTrackingReportDefinition.ICreate,
      },
    );
  typia.assert(createdReport);
  TestValidator.predicate(
    "report definition is active",
    createdReport.is_active === true,
  );
  const reportDefinitionId = createdReport.id;
  // 3) Create first dimension (sort_order = 1)
  const dimensionKey1 = `dim_${RandomGenerator.alphabets(8)}`;
  const dimensionLabel1 = `Label ${RandomGenerator.name(2)}`;
  const createdDimension1 =
    await generate_random_erp_hrm_time_tracking_report_definitions_dimensions_create_report_definition_dimension(
      memberConnection,
      {
        params: { reportDefinitionId },
        body: {
          dimension_key: dimensionKey1,
          dimension_label: dimensionLabel1,
          sort_order: 1,
        } satisfies IErpHrmTimeTrackingReportDefinitionDimension.ICreate,
      },
    );
  typia.assert(createdDimension1);
  TestValidator.equals(
    "dimension1 reportDefinitionId",
    createdDimension1.reportDefinitionId,
    reportDefinitionId,
  );
  TestValidator.equals(
    "dimension1 key",
    createdDimension1.dimensionKey,
    dimensionKey1,
  );
  TestValidator.equals(
    "dimension1 label",
    createdDimension1.dimensionLabel,
    dimensionLabel1,
  );
  TestValidator.equals("dimension1 sort_order", createdDimension1.sortOrder, 1);
  // 4) Create second dimension (sort_order = 2)
  const dimensionKey2 = `dim_${RandomGenerator.alphabets(8)}`;
  const dimensionLabel2 = `Label ${RandomGenerator.name(2)}`;
  const createdDimension2 =
    await generate_random_erp_hrm_time_tracking_report_definitions_dimensions_create_report_definition_dimension(
      memberConnection,
      {
        params: { reportDefinitionId },
        body: {
          dimension_key: dimensionKey2,
          dimension_label: dimensionLabel2,
          sort_order: 2,
        } satisfies IErpHrmTimeTrackingReportDefinitionDimension.ICreate,
      },
    );
  typia.assert(createdDimension2);
  TestValidator.equals(
    "dimension2 reportDefinitionId",
    createdDimension2.reportDefinitionId,
    reportDefinitionId,
  );
  TestValidator.equals(
    "dimension2 key",
    createdDimension2.dimensionKey,
    dimensionKey2,
  );
  TestValidator.equals(
    "dimension2 label",
    createdDimension2.dimensionLabel,
    dimensionLabel2,
  );
  TestValidator.equals("dimension2 sort_order", createdDimension2.sortOrder, 2);
  TestValidator.notEquals(
    "dimensions are distinct",
    createdDimension1.id,
    createdDimension2.id,
  );
}
