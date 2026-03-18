import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
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
import { generate_random_erp_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_organizations_create";
import { generate_random_erp_hrm_time_tracking_report_definitions_create } from "../../../generate/generate_random_erp_hrm_time_tracking_report_definitions_create";
import { prepare_random_erp_hrm_time_tracking_organization } from "../../../prepare/prepare_random_erp_hrm_time_tracking_organization";
import { prepare_random_erp_hrm_time_tracking_report_definition } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition";
import { prepare_random_erp_hrm_time_tracking_report_definition_dimension } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_dimension";
import { prepare_random_erp_hrm_time_tracking_report_definition_filter } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_filter";

export async function test_api_report_definition_update_denied_wrong_org_or_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // ===== Subcase A: organization mismatch =====
  const memberXConnection: api.IConnection = { host: connection.host };
  const memberXEmail = typia.random<string & tags.Format<"email">>();
  const memberXPassword = "TestPassword123!";
  const orgXName = `org-x-${RandomGenerator.alphabets(10)}`;
  await authorize_member_join(memberXConnection, {
    body: {
      email: memberXEmail,
      password: memberXPassword,
      organizationName: orgXName,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1 satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<12>,
      href: "https://example.com/href" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/referrer" satisfies string &
        tags.Format<"uri">,
      ip: null,
    },
  });
  const reportInOrgX = await generate_random_erp_hrm_time_tracking_report_definitions_create(
    memberXConnection,
    {},
  );
  typia.assert(reportInOrgX);
  const memberYConnection: api.IConnection = { host: connection.host };
  const memberYEmail = typia.random<string & tags.Format<"email">>();
  const orgYName = `org-y-${RandomGenerator.alphabets(10)}`;
  await authorize_member_join(memberYConnection, {
    body: {
      email: memberYEmail,
      password: memberXPassword,
      organizationName: orgYName,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 2 satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<12>,
      href: "https://example.com/href" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/referrer" satisfies string &
        tags.Format<"uri">,
      ip: null,
    },
  });
  const deniedBodyA: IErpHrmTimeTrackingReportDefinition.IUpdate = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    // keep report_type unchanged to avoid 400 input validation
    report_type: reportInOrgX.report_type,
    is_active: !reportInOrgX.is_active,
    code: `${reportInOrgX.code}-updated`,
  };
  await TestValidator.httpError(
    "update denied for wrong org (member from different organization)",
    [403, 404],
    async () =>
      await api.functional.erpHrmTimeTracking.reportDefinitions.update(
        memberYConnection,
        {
          reportDefinitionId: reportInOrgX.id,
          body: deniedBodyA,
        },
      ),
  );
  // ===== Subcase B: target is deleted =====
  const reportInOrgX2 = await generate_random_erp_hrm_time_tracking_report_definitions_create(
    memberXConnection,
    {},
  );
  typia.assert(reportInOrgX2);
  await api.functional.erpHrmTimeTracking.reportDefinitions.erase(
    memberXConnection,
    {
      reportDefinitionId: reportInOrgX2.id,
    },
  );
  const deniedBodyB: IErpHrmTimeTrackingReportDefinition.IUpdate = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: null,
    report_type: reportInOrgX2.report_type,
    is_active: !reportInOrgX2.is_active,
    code: `${reportInOrgX2.code}-updated`,
  };
  await TestValidator.httpError(
    "update denied for deleted report definition",
    [403, 404],
    async () =>
      await api.functional.erpHrmTimeTracking.reportDefinitions.update(
        memberXConnection,
        {
          reportDefinitionId: reportInOrgX2.id,
          body: deniedBodyB,
        },
      ),
  );
}
