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

export async function test_api_report_definition_delete_cross_organization_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A joins (Organization A)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "pw-a-" + RandomGenerator.alphabets(12),
    organizationName: `orgA_${RandomGenerator.alphabets(10)}`,
    organizationDescription: `descA_${RandomGenerator.alphabets(8)}`,
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: memberAJoinBody,
  });
  typia.assert(memberAAuthorized);
  // 2) Create report definition under Organization A (use generator to avoid invalid config keys)
  const reportDefinitionA =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      memberAConnection,
      {},
    );
  typia.assert(reportDefinitionA);
  // 3) Member B joins (Organization B)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "pw-b-" + RandomGenerator.alphabets(12),
    organizationName: `orgB_${RandomGenerator.alphabets(10)}`,
    organizationDescription: `descB_${RandomGenerator.alphabets(8)}`,
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: memberBJoinBody,
  });
  typia.assert(memberBAuthorized);
  // 4) Attempt cross-organization delete
  await TestValidator.error(
    "cross-organization delete should be denied (not found/not accessible)",
    async () => {
      await api.functional.erpHrmTimeTracking.reportDefinitions.erase(
        memberBConnection,
        {
          reportDefinitionId: reportDefinitionA.id,
        },
      );
    },
  );
  // 5) Confirm Organization A report definition is still deletable (exists/un-deleted)
  await api.functional.erpHrmTimeTracking.reportDefinitions.erase(
    memberAConnection,
    {
      reportDefinitionId: reportDefinitionA.id,
    },
  );
  // 6) Confirm Organization B still cannot delete (ensures no cross-tenant access)
  await TestValidator.error(
    "organization B should not be able to delete report definition",
    async () => {
      await api.functional.erpHrmTimeTracking.reportDefinitions.erase(
        memberBConnection,
        { reportDefinitionId: reportDefinitionA.id },
      );
    },
  );
}
