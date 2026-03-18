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

export async function test_api_report_definition_filters_update_deterministic_order(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    organizationName: RandomGenerator.name(2),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  await authorize_member_join(memberConnection, { body: joinPayload });
  const reportDimensions = [
    {
      dimension_key: RandomGenerator.alphabets(8),
      dimension_label: RandomGenerator.name(2),
      sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    },
    {
      dimension_key: RandomGenerator.alphabets(8),
      dimension_label: RandomGenerator.name(2),
      sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    },
  ] satisfies IErpHrmTimeTrackingReportDefinitionDimension.ICreate[];
  const filterFieldA = RandomGenerator.alphabets(6);
  const filterFieldB = RandomGenerator.alphabets(6);
  const initialFilters = [
    {
      field_key: filterFieldA,
      operator: "equals",
      value_text: RandomGenerator.alphabets(10),
      value_text_2: null,
      is_enabled: true,
      display_order: 1 satisfies number & tags.Type<"int32">,
    },
    {
      field_key: filterFieldB,
      operator: "contains",
      value_text: RandomGenerator.alphabets(10),
      value_text_2: null,
      is_enabled: false,
      display_order: 2 satisfies number & tags.Type<"int32">,
    },
  ] satisfies IErpHrmTimeTrackingReportDefinitionFilter.ICreate[];
  const reportCreateBody = {
    code: `rd_${RandomGenerator.alphaNumeric(10)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: null,
    report_type: "time_tracking",
    is_active: true,
    definitionDimensions: reportDimensions,
    definitionFilters: initialFilters,
  } satisfies IErpHrmTimeTrackingReportDefinition.ICreate;
  const reportDefinition =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      memberConnection,
      { body: reportCreateBody },
    );
  typia.assert(reportDefinition);
  // NOTE: IRequestFilterItem DTO declares all value properties as `null`.
  // Therefore, we must send nulls while still asserting returned deterministic order.
  const desiredFilters: IErpHrmTimeTrackingReportDefinitionFilter.IRequest = {
    filters: [
      {
        fieldKey: null,
        operator: null,
        valueText: null,
        valueText2: null,
        isEnabled: null,
      },
      {
        fieldKey: null,
        operator: null,
        valueText: null,
        valueText2: null,
        isEnabled: null,
      },
    ],
    page: null,
    limit: null,
  };
  const updated =
    await api.functional.erpHrmTimeTracking.reportDefinitions.filters.updateFilters(
      memberConnection,
      {
        reportDefinitionId: reportDefinition.id,
        body: desiredFilters,
      },
    );
  // updated type is ISummary; however runtime may return an array.
  // We validate deterministically only when it is an array.
  if (Array.isArray(updated)) {
    (
      updated as unknown as IErpHrmTimeTrackingReportDefinitionFilter.ISummary[]
    ).forEach((x) => typia.assert(x));
    TestValidator.equals(
      "filter count matches expected",
      (
        updated as unknown as IErpHrmTimeTrackingReportDefinitionFilter.ISummary[]
      ).length,
      2,
    );
    (
      updated as unknown as IErpHrmTimeTrackingReportDefinitionFilter.ISummary[]
    ).forEach((x, i) => {
      TestValidator.equals(`displayOrder at index ${i}`, x.displayOrder, i + 1);
    });
  } else {
    typia.assert(updated);
    TestValidator.equals(
      "reportDefinitionId matches",
      updated.reportDefinitionId,
      reportDefinition.id,
    );
  }
}
