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

export async function test_api_report_definition_dimensions_create_ineligible_parent_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member with an active organization context.
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    organizationName: `org_${RandomGenerator.alphabets(8)}`,
    organizationDescription: `desc_${RandomGenerator.alphabets(10)}`,
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<12>,
    href: "https://example.com/accept",
    referrer: "https://example.com/ref",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const memberAuth = await authorize_member_join(memberConnection, {
    body: memberCredentials,
  });
  typia.assert(memberAuth);
  const authedConnection: api.IConnection = { host: connection.host };
  authedConnection.headers ??= {};
  authedConnection.headers.Authorization = memberAuth.token.access;
  const dimensionBody = {
    dimension_key: `dim_${RandomGenerator.alphabets(10)}`,
    dimension_label: `Dimension ${RandomGenerator.name(2)}`,
    sort_order: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IErpHrmTimeTrackingReportDefinitionDimension.ICreate;
  // 2-3) Variant A: Missing parent
  const missingReportDefinitionId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "missing parent report definition should reject dimension creation",
    async () => {
      await api.functional.erpHrmTimeTracking.reportDefinitions.dimensions.createReportDefinitionDimension(
        authedConnection,
        {
          reportDefinitionId: missingReportDefinitionId,
          body: dimensionBody,
        },
      );
    },
  );
  // 4-6) Variant B: Deleted parent
  const reportDefinition =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      authedConnection,
      {},
    );
  typia.assert(reportDefinition);
  await api.functional.erpHrmTimeTracking.reportDefinitions.erase(
    authedConnection,
    { reportDefinitionId: reportDefinition.id },
  );
  await TestValidator.error(
    "deleted parent report definition should reject dimension creation",
    async () => {
      await api.functional.erpHrmTimeTracking.reportDefinitions.dimensions.createReportDefinitionDimension(
        authedConnection,
        {
          reportDefinitionId: reportDefinition.id,
          body: dimensionBody,
        },
      );
    },
  );
}
