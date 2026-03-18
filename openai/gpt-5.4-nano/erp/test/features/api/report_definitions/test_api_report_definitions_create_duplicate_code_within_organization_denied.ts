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

export async function test_api_report_definitions_create_duplicate_code_within_organization_denied(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput: IErpHrmTimeTrackingMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassword!234",
    organizationName: `org_${RandomGenerator.alphabets(10)}`,
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "KRW",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/join",
    referrer: "https://example.com/ref",
    ip: undefined,
  };
  await authorize_member_join(memberConnection, { body: joinInput });
  const organization =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `tenant_${RandomGenerator.alphabets(10)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logo_url: null,
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
          >(),
        } satisfies IErpHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const codeDuplicate: string = `code_${RandomGenerator.alphabets(8)}`;
  const reportType: string = `rt_${RandomGenerator.alphabets(8)}`;
  const createBody1: IErpHrmTimeTrackingReportDefinition.ICreate = {
    code: codeDuplicate,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    report_type: reportType,
    is_active: true,
    definitionDimensions: [
      {
        dimension_key: `dim_${RandomGenerator.alphabets(6)}`,
        dimension_label: `Label ${RandomGenerator.alphabets(6)}`,
        sort_order: 1,
      },
    ],
    definitionFilters: [
      {
        field_key: `field_${RandomGenerator.alphabets(6)}`,
        operator: "eq",
        value_text: `value_${RandomGenerator.alphabets(6)}`,
        value_text_2: null,
        is_enabled: true,
        display_order: 1,
      },
    ],
  };
  const created1 =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      memberConnection,
      { body: createBody1 },
    );
  typia.assert(created1);
  TestValidator.equals("code matches", created1.code, codeDuplicate);
  TestValidator.equals("name matches", created1.name, createBody1.name);
  TestValidator.equals(
    "is_active matches",
    created1.is_active,
    createBody1.is_active,
  );
  const createBody2: IErpHrmTimeTrackingReportDefinition.ICreate = {
    code: codeDuplicate,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    report_type: reportType,
    is_active: false,
    definitionDimensions: [
      {
        dimension_key: `dim_${RandomGenerator.alphabets(6)}`,
        dimension_label: `Label ${RandomGenerator.alphabets(6)}`,
        sort_order: 1,
      },
    ],
    definitionFilters: [
      {
        field_key: `field_${RandomGenerator.alphabets(6)}`,
        operator: "eq",
        value_text: `value_${RandomGenerator.alphabets(6)}`,
        value_text_2: null,
        is_enabled: true,
        display_order: 1,
      },
    ],
  };
  await TestValidator.error(
    "duplicate code denied within same organization",
    async () => {
      await generate_random_erp_hrm_time_tracking_report_definitions_create(
        memberConnection,
        { body: createBody2 },
      );
    },
  );
  // Validate the original response is unchanged from what we received initially.
  TestValidator.equals("original id stays the same", created1.id, created1.id);
  TestValidator.equals("original code preserved", created1.code, codeDuplicate);
  TestValidator.equals(
    "original name preserved",
    created1.name,
    createBody1.name,
  );
  TestValidator.equals(
    "original is_active preserved",
    created1.is_active,
    createBody1.is_active,
  );
  const uniqueCode3: string = `code_${RandomGenerator.alphabets(8)}_3`;
  const createBody3: IErpHrmTimeTrackingReportDefinition.ICreate = {
    code: uniqueCode3,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    report_type: reportType,
    is_active: true,
    definitionDimensions: [
      {
        dimension_key: `dim_${RandomGenerator.alphabets(6)}`,
        dimension_label: `Label ${RandomGenerator.alphabets(6)}`,
        sort_order: 1,
      },
    ],
    definitionFilters: [
      {
        field_key: `field_${RandomGenerator.alphabets(6)}`,
        operator: "eq",
        value_text: `value_${RandomGenerator.alphabets(6)}`,
        value_text_2: null,
        is_enabled: true,
        display_order: 1,
      },
    ],
  };
  const created3 =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      memberConnection,
      { body: createBody3 },
    );
  typia.assert(created3);
  TestValidator.equals("third code created", created3.code, uniqueCode3);
}
