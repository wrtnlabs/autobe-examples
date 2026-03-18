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

export async function test_api_report_definition_filter_display_order_enabled_disabled(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password!1234",
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: "https://example.com/href",
      referrer: "https://example.com/referrer",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(memberAuthorized);

  const reportDefinition =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      memberConnection,
      {
        body: {
          code: `rpt_${RandomGenerator.alphabets(10)}`,
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          report_type: "time_tracking",
          is_active: true,
        },
      },
    );
  typia.assert(reportDefinition);

  const reportDefinitionId = reportDefinition.id;

  await generate_random_erp_hrm_time_tracking_report_definitions_filters_create_report_definition_filter(
    memberConnection,
    {
      params: { reportDefinitionId },
      body: {
        field_key: typia.random<string>(),
        operator: typia.random<string>(),
        value_text: typia.random<string>(),
        value_text_2: typia.random<string>(),
        is_enabled: true,
        display_order: 1 satisfies number & tags.Type<"int32">,
      } satisfies IErpHrmTimeTrackingReportDefinitionFilter.ICreate,
    },
  );

  await generate_random_erp_hrm_time_tracking_report_definitions_filters_create_report_definition_filter(
    memberConnection,
    {
      params: { reportDefinitionId },
      body: {
        field_key: typia.random<string>(),
        operator: typia.random<string>(),
        value_text: typia.random<string>(),
        value_text_2: typia.random<string>(),
        is_enabled: false,
        display_order: 2 satisfies number & tags.Type<"int32">,
      } satisfies IErpHrmTimeTrackingReportDefinitionFilter.ICreate,
    },
  );

  await generate_random_erp_hrm_time_tracking_report_definitions_filters_create_report_definition_filter(
    memberConnection,
    {
      params: { reportDefinitionId },
      body: {
        field_key: typia.random<string>(),
        operator: typia.random<string>(),
        value_text: typia.random<string>(),
        value_text_2: typia.random<string>(),
        is_enabled: true,
        display_order: 3 satisfies number & tags.Type<"int32">,
      } satisfies IErpHrmTimeTrackingReportDefinitionFilter.ICreate,
    },
  );

  TestValidator.predicate(
    "report definition was created",
    reportDefinition.id === reportDefinitionId,
  );
}
