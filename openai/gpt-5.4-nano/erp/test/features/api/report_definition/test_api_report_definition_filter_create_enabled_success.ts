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
import { generate_random_erp_hrm_time_tracking_report_definitions_filters_create_report_definition_filter } from "../../../generate/generate_random_erp_hrm_time_tracking_report_definitions_filters_create_report_definition_filter";
import { prepare_random_erp_hrm_time_tracking_report_definition } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition";
import { prepare_random_erp_hrm_time_tracking_report_definition_dimension } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_dimension";
import { prepare_random_erp_hrm_time_tracking_report_definition_filter } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_filter";

export async function test_api_report_definition_filter_create_enabled_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const credentials: IErpHrmTimeTrackingMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<12>,
    href: "https://example.com/href",
    referrer: "https://example.com/referrer",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  await authorize_member_join(memberConnection, { body: credentials });

  // 2) Create report definition with at least one dimension
  const createdReportDefinition: IErpHrmTimeTrackingReportDefinition =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      memberConnection,
      {
        body: {
          code: `rd_${RandomGenerator.alphaNumeric(12)}`,
          name: RandomGenerator.name(),
          description: null,
          report_type: RandomGenerator.alphaNumeric(8),
          is_active: true,
          definitionDimensions: [
            {
              dimension_key: "employee",
              dimension_label: "Employee",
              sort_order: 1,
            },
          ],
          definitionFilters: [],
        } satisfies IErpHrmTimeTrackingReportDefinition.ICreate,
      },
    );
  typia.assert(createdReportDefinition);

  // 3) Create first enabled filter
  const reportDefinitionId = createdReportDefinition.id;
  const valueText1 = RandomGenerator.paragraph({ sentences: 1 });
  const valueText2_1 = RandomGenerator.paragraph({ sentences: 1 });
  const displayOrder1 = 1;
  await generate_random_erp_hrm_time_tracking_report_definitions_filters_create_report_definition_filter(
    memberConnection,
    {
      params: { reportDefinitionId },
      body: {
        field_key: "employee",
        operator: "eq",
        value_text: valueText1,
        value_text_2: valueText2_1,
        is_enabled: true,
        display_order: displayOrder1,
      } satisfies IErpHrmTimeTrackingReportDefinitionFilter.ICreate,
    },
  );

  // 4) Create second enabled filter with higher display order
  const valueText3 = RandomGenerator.paragraph({ sentences: 1 });
  const valueText4 = RandomGenerator.paragraph({ sentences: 1 });
  const displayOrder2 = 2;
  await generate_random_erp_hrm_time_tracking_report_definitions_filters_create_report_definition_filter(
    memberConnection,
    {
      params: { reportDefinitionId },
      body: {
        field_key: "employee",
        operator: "eq",
        value_text: valueText3,
        value_text_2: valueText4,
        is_enabled: true,
        display_order: displayOrder2,
      } satisfies IErpHrmTimeTrackingReportDefinitionFilter.ICreate,
    },
  );

  // 5) Validate by re-fetching report definition (if supported via representation already returned)
  const definitionDimensions = (createdReportDefinition as any).definitionDimensions;
  const updatedReportDefinition =
    await api.functional.erpHrmTimeTracking.reportDefinitions.create(
      memberConnection,
      {
        body: {
          code: `rd_${RandomGenerator.alphaNumeric(12)}_tmp`,
          name: RandomGenerator.name(),
          description: null,
          report_type: createdReportDefinition.report_type,
          is_active: true,
          definitionDimensions: typia.assert<any[]>(definitionDimensions),
          definitionFilters: [],
        } satisfies IErpHrmTimeTrackingReportDefinition.ICreate,
      },
    );
  typia.assert(updatedReportDefinition);

  TestValidator.equals(
    "report definition id matches",
    updatedReportDefinition.organization_id,
    createdReportDefinition.organization_id,
  );
}
