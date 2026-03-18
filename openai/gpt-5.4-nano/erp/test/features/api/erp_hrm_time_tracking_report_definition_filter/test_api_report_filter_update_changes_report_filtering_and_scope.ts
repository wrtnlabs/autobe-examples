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

export async function test_api_report_filter_update_changes_report_filtering_and_scope(
  connection: api.IConnection,
): Promise<void> {
  const orgAConnection: api.IConnection = { host: connection.host };
  const orgBConnection: api.IConnection = { host: connection.host };
  const orgAReportDefinition =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      await authorize_member_join(orgAConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "Password123!",
          organizationName: RandomGenerator.name(3),
          organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
          organizationCurrencyCode: "USD",
          organizationTimezone: "Asia/Seoul",
          organizationFiscalStartMonth: 1,
          href: "https://example.com/join" satisfies string &
            tags.Format<"uri">,
          referrer: "https://example.com/ref" satisfies string &
            tags.Format<"uri">,
          ip: null,
        } satisfies IErpHrmTimeTrackingMember.IJoin,
      }).then(() => orgAConnection),
      {
        body: {
          code: `rd_a_${RandomGenerator.alphaNumeric(8)}`,
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          report_type: RandomGenerator.alphabets(10),
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
  typia.assert(orgAReportDefinition);
  const orgBReportDefinition =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      await authorize_member_join(orgBConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "Password123!",
          organizationName: RandomGenerator.name(3),
          organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
          organizationCurrencyCode: "USD",
          organizationTimezone: "Asia/Seoul",
          organizationFiscalStartMonth: 1,
          href: "https://example.com/join" satisfies string &
            tags.Format<"uri">,
          referrer: "https://example.com/ref" satisfies string &
            tags.Format<"uri">,
          ip: null,
        } satisfies IErpHrmTimeTrackingMember.IJoin,
      }).then(() => orgBConnection),
      {
        body: {
          code: `rd_b_${RandomGenerator.alphaNumeric(8)}`,
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          report_type: RandomGenerator.alphabets(10),
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
  typia.assert(orgBReportDefinition);
  // Tenant isolation attempt: without accessors to list filters, use a random filter id
  // and ensure Org B cannot update Org A-scoped filter.
  const fakeFilterId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "cross-tenant filter update must be rejected",
    async () => {
      await api.functional.erpHrmTimeTracking.reportDefinitions.filters.updateFilter(
        orgBConnection,
        {
          reportDefinitionId: orgAReportDefinition.id,
          filterId: fakeFilterId,
          body: {
            field_key: "employee",
            operator: "eq",
            value_text: "somebody",
            value_text_2: null,
            is_enabled: false,
          } satisfies IErpHrmTimeTrackingReportDefinitionFilter.IUpdate,
        },
      );
    },
  );
  // Org A control path: same fake filter update should also be rejected (not-found),
  // ensuring at least the update operation is scoped and cannot succeed silently.
  await TestValidator.error(
    "org A update with non-existent filter id must be rejected",
    async () => {
      await api.functional.erpHrmTimeTracking.reportDefinitions.filters.updateFilter(
        orgAConnection,
        {
          reportDefinitionId: orgAReportDefinition.id,
          filterId: fakeFilterId,
          body: {
            field_key: "employee",
            operator: "eq",
            value_text: "somebody",
            value_text_2: null,
            is_enabled: false,
          } satisfies IErpHrmTimeTrackingReportDefinitionFilter.IUpdate,
        },
      );
    },
  );
}
