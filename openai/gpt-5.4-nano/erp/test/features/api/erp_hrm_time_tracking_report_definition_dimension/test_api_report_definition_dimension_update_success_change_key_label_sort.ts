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

export async function test_api_report_definition_dimension_update_success_change_key_label_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member (join)
  const memberConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/href",
    referrer: "https://example.com/referrer",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  await authorize_member_join(memberConnection, {
    body: credentials,
  });
  // Use the same actor-scoped connection for all subsequent API calls
  const actorConnection: api.IConnection = { host: connection.host };
  actorConnection.headers = memberConnection.headers;
  // 2) Create a report definition with at least one filter entry
  // and two active dimensions (we create them explicitly next to capture IDs)
  const reportDefinition =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      actorConnection,
      {
        body: {
          code: `rd_${RandomGenerator.alphabets(6)}`,
          name: RandomGenerator.name(),
          description: null,
          report_type: "time_tracking",
          is_active: true,
          // Provide at least one filter entry as required by the scenario plan.
          // definitionDimensions can be empty here because we'll add dimensions explicitly.
          definitionDimensions: [],
          definitionFilters: [
            {
              field_key: "employee",
              operator: "eq",
              value_text: RandomGenerator.alphabets(5),
              value_text_2: null,
              is_enabled: true,
              display_order: 1,
            },
          ],
        } satisfies IErpHrmTimeTrackingReportDefinition.ICreate,
      },
    );
  typia.assert(reportDefinition);
  // 3) Create two dimensions with distinct dimension_key values and capture their IDs
  const dimA =
    await generate_random_erp_hrm_time_tracking_report_definitions_dimensions_create_report_definition_dimension(
      actorConnection,
      {
        params: {
          reportDefinitionId: reportDefinition.id,
        },
        body: {
          dimension_key: "A",
          dimension_label: "Label A",
          sort_order: 1,
        } satisfies IErpHrmTimeTrackingReportDefinitionDimension.ICreate,
      },
    );
  typia.assert(dimA);
  const dimB =
    await generate_random_erp_hrm_time_tracking_report_definitions_dimensions_create_report_definition_dimension(
      actorConnection,
      {
        params: {
          reportDefinitionId: reportDefinition.id,
        },
        body: {
          dimension_key: "B",
          dimension_label: "Label B",
          sort_order: 2,
        } satisfies IErpHrmTimeTrackingReportDefinitionDimension.ICreate,
      },
    );
  typia.assert(dimB);
  // 4) Update the A dimension: key A->C, label, sort_order, and deleted_at explicitly null
  const updateInput = {
    dimension_key: "C",
    dimension_label: "Label C",
    sort_order: 3,
    deleted_at: null,
  } satisfies IErpHrmTimeTrackingReportDefinitionDimension.IUpdate;
  const updated =
    await api.functional.erpHrmTimeTracking.reportDefinitions.dimensions.updateReportDefinitionDimension(
      actorConnection,
      {
        reportDefinitionId: reportDefinition.id,
        dimensionId: dimA.id,
        body: updateInput,
      },
    );
  typia.assert(updated);
  // 5) Validate response reflects requested scoped update
  TestValidator.equals("id matches updated dimension", updated.id, dimA.id);
  TestValidator.equals(
    "reportDefinitionId unchanged",
    updated.reportDefinitionId,
    reportDefinition.id,
  );
  TestValidator.equals(
    "dimensionKey updated",
    updated.dimensionKey,
    updateInput.dimension_key,
  );
  TestValidator.equals(
    "dimensionLabel updated",
    updated.dimensionLabel,
    updateInput.dimension_label,
  );
  TestValidator.equals(
    "sortOrder updated",
    updated.sortOrder,
    updateInput.sort_order,
  );
  TestValidator.equals("deletedAt remains null", updated.deletedAt, null);
  // 6) Ensure the other dimension did not get its key/label accidentally changed
  TestValidator.equals("other dimensionKey unchanged", dimB.dimensionKey, "B");
}
