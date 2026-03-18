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

export async function test_api_report_definition_filter_erase_repeated_delete_not_found(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password!1234",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<12>,
    href: "https://example.com/" satisfies string as string &
      tags.Format<"uri">,
    referrer: "https://example.com/ref" satisfies string as string &
      tags.Format<"uri">,
    organizationLogoUrl: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  await authorize_member_join(memberConnection, { body: joinInput });
  const reportDefinition =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      memberConnection,
      {
        body: {
          code: `rd_${RandomGenerator.alphaNumeric(10)}`,
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          report_type: typia.random<string>(),
          is_active: true,
          definitionDimensions: [
            {
              dimension_key: `dim_${RandomGenerator.alphaNumeric(8)}`,
              dimension_label: RandomGenerator.name(),
              sort_order: typia.random<
                number & tags.Type<"int32"> & tags.Minimum<1>
              >(),
            },
          ],
          definitionFilters: [
            {
              field_key: typia.random<string>(),
              operator: typia.random<string>(),
              value_text: RandomGenerator.name(),
              value_text_2: null,
              is_enabled: true,
              display_order: typia.random<
                number & tags.Type<"int32"> & tags.Minimum<1>
              >(),
            },
          ],
        },
      },
    );
  typia.assert(reportDefinition);
  const reportDefinitionId = reportDefinition.id;
  const unknownFilterId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "first delete should fail (unknown filter id)",
    async () => {
      await api.functional.erpHrmTimeTracking.reportDefinitions.filters.erase(
        memberConnection,
        {
          reportDefinitionId,
          filterId: unknownFilterId,
        },
      );
    },
  );
  await TestValidator.error(
    "second delete should fail with same not-found outcome",
    async () => {
      await api.functional.erpHrmTimeTracking.reportDefinitions.filters.erase(
        memberConnection,
        {
          reportDefinitionId,
          filterId: unknownFilterId,
        },
      );
    },
  );
}
