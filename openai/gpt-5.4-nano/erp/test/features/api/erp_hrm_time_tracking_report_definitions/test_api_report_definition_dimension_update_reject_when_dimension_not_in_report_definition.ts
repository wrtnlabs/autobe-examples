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

export async function test_api_report_definition_dimension_update_reject_when_dimension_not_in_report_definition(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      organizationName: `org-${RandomGenerator.alphaNumeric(8)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 4,
      href: "https://example.com/join",
      referrer: "https://example.com/app",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(memberAuthorized);
  const reportDefinition1 =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      memberConnection,
      {
        body: {
          code: `rd1-${RandomGenerator.alphaNumeric(8)}`,
          name: `Report 1 ${RandomGenerator.alphaNumeric(4)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          report_type: "timeTracking",
          is_active: true,
          definitionDimensions: [],
          definitionFilters: [],
        } satisfies IErpHrmTimeTrackingReportDefinition.ICreate,
      },
    );
  typia.assert(reportDefinition1);
  const reportDefinition2 =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      memberConnection,
      {
        body: {
          code: `rd2-${RandomGenerator.alphaNumeric(8)}`,
          name: `Report 2 ${RandomGenerator.alphaNumeric(4)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          report_type: "timeTracking",
          is_active: true,
          definitionDimensions: [],
          definitionFilters: [],
        } satisfies IErpHrmTimeTrackingReportDefinition.ICreate,
      },
    );
  typia.assert(reportDefinition2);
  const dimensionUnderReport1 =
    await generate_random_erp_hrm_time_tracking_report_definitions_dimensions_create_report_definition_dimension(
      memberConnection,
      {
        params: {
          reportDefinitionId: reportDefinition1.id,
        },
        body: {
          dimension_key: `dimKey-${RandomGenerator.alphaNumeric(8)}`,
          dimension_label: `Dim Label ${RandomGenerator.alphaNumeric(6)}`,
          sort_order: 1,
        } satisfies IErpHrmTimeTrackingReportDefinitionDimension.ICreate,
      },
    );
  typia.assert(dimensionUnderReport1);
  const originalSnapshot: IErpHrmTimeTrackingReportDefinitionDimension =
    dimensionUnderReport1;
  await TestValidator.error(
    "should reject updating a dimension with a mismatched reportDefinitionId",
    async () => {
      const result =
        await api.functional.erpHrmTimeTracking.reportDefinitions.dimensions.updateReportDefinitionDimension(
          memberConnection,
          {
            reportDefinitionId: reportDefinition2.id,
            dimensionId: dimensionUnderReport1.id,
            body: {
              dimension_label: `Updated ${RandomGenerator.alphaNumeric(6)}`,
              sort_order: 1,
            } satisfies IErpHrmTimeTrackingReportDefinitionDimension.IUpdate,
          },
        );
      // If the system incorrectly allows the update, ensure it didn't change key fields.
      typia.assert(result);
      TestValidator.equals(
        "dimensionKey must remain unchanged",
        result.dimensionKey,
        originalSnapshot.dimensionKey,
      );
      TestValidator.equals(
        "dimensionLabel must remain unchanged",
        result.dimensionLabel,
        originalSnapshot.dimensionLabel,
      );
      TestValidator.equals(
        "sortOrder must remain unchanged",
        result.sortOrder,
        originalSnapshot.sortOrder,
      );
      TestValidator.equals(
        "deletedAt must remain unchanged",
        result.deletedAt,
        originalSnapshot.deletedAt,
      );
    },
  );
}
