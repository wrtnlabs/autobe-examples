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

export async function test_api_report_definition_filter_tenant_isolation_forbidden(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAJoin = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password!234",
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 4,
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(memberAJoin);
  const reportDefinitionA =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      memberAConnection,
      {
        body: {
          code: `rd-${RandomGenerator.alphaNumeric(10)}`,
          name: RandomGenerator.name(),
          description: null,
          report_type: `report_type_${RandomGenerator.alphaNumeric(6)}`,
          is_active: true,
          definitionDimensions: [
            {
              dimension_key: `dim_${RandomGenerator.alphaNumeric(6)}`,
              dimension_label: RandomGenerator.name(),
              sort_order: 1,
            },
          ],
          definitionFilters: [
            {
              field_key: `field_${RandomGenerator.alphaNumeric(6)}`,
              operator: "eq",
              value_text: RandomGenerator.alphabets(8),
              value_text_2: null,
              is_enabled: true,
              display_order: 1,
            },
          ],
        },
      },
    );
  typia.assert(reportDefinitionA);
  const reportDefinitionIdA = reportDefinitionA.id;
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBJoin = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password!234",
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 5,
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(memberBJoin);
  const filterBody = {
    field_key: `field_${RandomGenerator.alphaNumeric(6)}`,
    operator: "eq",
    value_text: RandomGenerator.alphabets(8),
    value_text_2: null,
    is_enabled: true,
    display_order: 1,
  } satisfies IErpHrmTimeTrackingReportDefinitionFilter.ICreate;
  try {
    await api.functional.erpHrmTimeTracking.reportDefinitions.filters.createReportDefinitionFilter(
      memberBConnection,
      {
        reportDefinitionId: reportDefinitionIdA,
        body: filterBody,
      },
    );
    throw new Error("expected failure but succeeded");
  } catch (e) {
    const err = e as unknown as {
      status?: number;
      message?: string;
    };
    if (typeof err?.status !== "number" || typeof err?.message !== "string") throw e;

    TestValidator.predicate(
      "should be forbidden or not-found for cross-tenant access",
      err.status === 403 || err.status === 404,
    );

    const message = err.message;
    TestValidator.predicate(
      "message should not contain reportDefinitionIdA",
      !message.includes(reportDefinitionIdA),
    );
    TestValidator.predicate(
      "message should not disclose tenant/organization",
      !/tenant|organization/i.test(message),
    );
  }
}
