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

export async function test_api_report_definition_delete_success_removes_from_org_availability(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const joinedA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd!",
      organizationName: `org_${RandomGenerator.alphabets(10)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1 satisfies number as number,
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
      ip: undefined,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joinedA);
  const reportDefinitionA =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      memberAConnection,
      {
        body: {
          code: `code_${RandomGenerator.alphabets(10)}`,
          name: RandomGenerator.name(),
          description: null,
          report_type: typia.random<string>(),
          is_active: true,
          definitionDimensions: [
            {
              dimension_key: typia.random<string>(),
              dimension_label: typia.random<string>(),
              sort_order: 1 satisfies number as number,
            },
          ],
          definitionFilters: [
            {
              field_key: typia.random<string>(),
              operator: typia.random<string>(),
              value_text: typia.random<string>(),
              value_text_2: null,
              is_enabled: true,
              display_order: 1 satisfies number as number,
            },
          ],
        } satisfies IErpHrmTimeTrackingReportDefinition.ICreate,
      },
    );
  typia.assert(reportDefinitionA);
  // Create a separate organization (Org B) to verify tenant isolation
  const memberBConnection: api.IConnection = { host: connection.host };
  const joinedB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd!",
      organizationName: `org_${RandomGenerator.alphabets(10)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1 satisfies number as number,
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
      ip: undefined,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joinedB);
  const reportDefinitionB =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      memberBConnection,
      {
        body: {
          code: `code_${RandomGenerator.alphabets(10)}`,
          name: RandomGenerator.name(),
          description: null,
          report_type: typia.random<string>(),
          is_active: true,
          definitionDimensions: [
            {
              dimension_key: typia.random<string>(),
              dimension_label: typia.random<string>(),
              sort_order: 1 satisfies number as number,
            },
          ],
          definitionFilters: [
            {
              field_key: typia.random<string>(),
              operator: typia.random<string>(),
              value_text: typia.random<string>(),
              value_text_2: null,
              is_enabled: true,
              display_order: 1 satisfies number as number,
            },
          ],
        } satisfies IErpHrmTimeTrackingReportDefinition.ICreate,
      },
    );
  typia.assert(reportDefinitionB);
  // Verify organization scoping: Org A member cannot delete Org B definition
  await TestValidator.error(
    "should not allow cross-organization deletion",
    async () => {
      await api.functional.erpHrmTimeTracking.reportDefinitions.erase(
        memberAConnection,
        {
          reportDefinitionId: reportDefinitionB.id,
        },
      );
    },
  );
  // Delete Org A definition successfully
  await api.functional.erpHrmTimeTracking.reportDefinitions.erase(
    memberAConnection,
    {
      reportDefinitionId: reportDefinitionA.id,
    },
  );
  // Deleted definition should be unavailable: deleting it again should fail
  await TestValidator.error(
    "deleted definition should be treated as unavailable",
    async () => {
      await api.functional.erpHrmTimeTracking.reportDefinitions.erase(
        memberAConnection,
        {
          reportDefinitionId: reportDefinitionA.id,
        },
      );
    },
  );
}
