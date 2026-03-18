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

export async function test_api_report_definitions_create_transaction_rolls_back_on_child_dimension_failure(
  connection: api.IConnection,
): Promise<void> {
  const targetCode = `CODE_TX_ROLLBACK_${RandomGenerator.alphabets(10)}`;
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password!1234",
      organizationName: RandomGenerator.name(2),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const dimensionKey = `dim_${RandomGenerator.alphabets(8)}`;
  const dimensionLabelA = `label_${RandomGenerator.alphabets(6)}`;
  const dimensionLabelB = `label_${RandomGenerator.alphabets(6)}`;
  const sort1 = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const sort2 = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const failingDimensions: IErpHrmTimeTrackingReportDefinitionDimension.ICreate[] =
    [
      {
        dimension_key: dimensionKey,
        dimension_label: dimensionLabelA,
        sort_order: sort1,
      },
      {
        dimension_key: dimensionKey,
        dimension_label: dimensionLabelB,
        sort_order: sort2,
      },
    ];
  const filter: IErpHrmTimeTrackingReportDefinitionFilter.ICreate = {
    field_key: `field_${RandomGenerator.alphabets(6)}`,
    operator: `eq`,
    value_text: RandomGenerator.alphabets(6),
    value_text_2: null,
    is_enabled: true,
    display_order: 1 as number & tags.Type<"int32">,
  };
  await TestValidator.error(
    "create report definition should rollback when duplicate dimension_key fails",
    async () => {
      await generate_random_erp_hrm_time_tracking_report_definitions_create(
        memberConnection,
        {
          body: {
            code: targetCode,
            name: `Report ${RandomGenerator.name(2)}`,
            description: null,
            report_type: `type_${RandomGenerator.alphabets(6)}`,
            is_active: true,
            definitionDimensions: failingDimensions,
            definitionFilters: [filter],
          } satisfies IErpHrmTimeTrackingReportDefinition.ICreate,
        },
      );
    },
  );
  const fixedDimensionKeyB = `dim_${RandomGenerator.alphabets(8)}_b`;
  const fixedDimensions: IErpHrmTimeTrackingReportDefinitionDimension.ICreate[] =
    [
      {
        dimension_key: dimensionKey,
        dimension_label: dimensionLabelA,
        sort_order: sort1,
      },
      {
        dimension_key: fixedDimensionKeyB,
        dimension_label: dimensionLabelB,
        sort_order: sort2,
      },
    ];
  const created =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      memberConnection,
      {
        body: {
          code: targetCode,
          name: `Report ${RandomGenerator.name(2)}`,
          description: null,
          report_type: `type_${RandomGenerator.alphabets(6)}`,
          is_active: true,
          definitionDimensions: fixedDimensions,
          definitionFilters: [filter],
        } satisfies IErpHrmTimeTrackingReportDefinition.ICreate,
      },
    );
  typia.assert(created);
  TestValidator.equals("retry uses same code", created.code, targetCode);
}
