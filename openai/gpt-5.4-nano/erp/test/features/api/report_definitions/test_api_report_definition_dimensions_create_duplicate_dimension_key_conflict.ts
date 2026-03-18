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

export async function test_api_report_definition_dimensions_create_duplicate_dimension_key_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member with an active organization context
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password-" + typia.random<string>(),
      organizationName: typia.random<string>(),
      organizationDescription: typia.random<string>(),
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >() satisfies number as number,
      href: "https://example.com/join",
      referrer: "https://example.com/start",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  // 2) Create a report definition to host dimensions
  const reportDefinition =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      memberConnection,
      {
        body: {
          code: typia.random<string>(),
          name: typia.random<string>(),
          description: null,
          report_type: "grouped_dimensions",
          is_active: true,
          definitionDimensions: [],
          definitionFilters: [],
        } satisfies IErpHrmTimeTrackingReportDefinition.ICreate,
      },
    );
  typia.assert(reportDefinition);
  // 3) Create first dimension with unique dimension_key K
  const dimensionKey = typia.random<string & tags.MinLength<1>>();
  const created1 =
    await generate_random_erp_hrm_time_tracking_report_definitions_dimensions_create_report_definition_dimension(
      memberConnection,
      {
        params: {
          reportDefinitionId: reportDefinition.id satisfies string &
            tags.Format<"uuid">,
        },
        body: {
          dimension_key: dimensionKey,
          dimension_label: typia.random<string>(),
          sort_order: 1,
        } satisfies IErpHrmTimeTrackingReportDefinitionDimension.ICreate,
      },
    );
  typia.assert(created1);
  TestValidator.equals(
    "dimensionKey matches input",
    created1.dimensionKey,
    dimensionKey,
  );
  // 4) Attempt to create second dimension with the same dimension_key
  await TestValidator.httpError(
    "reject duplicate dimension_key within same report definition",
    [409],
    async () => {
      await generate_random_erp_hrm_time_tracking_report_definitions_dimensions_create_report_definition_dimension(
        memberConnection,
        {
          params: {
            reportDefinitionId: reportDefinition.id satisfies string &
              tags.Format<"uuid">,
          },
          body: {
            dimension_key: dimensionKey,
            dimension_label: typia.random<string>(),
            sort_order: 2,
          } satisfies IErpHrmTimeTrackingReportDefinitionDimension.ICreate,
        },
      );
    },
  );
  // 5) Verify uniqueness is still enforced (implies no extra dimension with duplicate key was persisted)
  await TestValidator.httpError(
    "no partial dimension persisted for duplicate attempt",
    [409],
    async () => {
      await generate_random_erp_hrm_time_tracking_report_definitions_dimensions_create_report_definition_dimension(
        memberConnection,
        {
          params: {
            reportDefinitionId: reportDefinition.id satisfies string &
              tags.Format<"uuid">,
          },
          body: {
            dimension_key: dimensionKey,
            dimension_label: typia.random<string>(),
            sort_order: 3,
          } satisfies IErpHrmTimeTrackingReportDefinitionDimension.ICreate,
        },
      );
    },
  );
}
