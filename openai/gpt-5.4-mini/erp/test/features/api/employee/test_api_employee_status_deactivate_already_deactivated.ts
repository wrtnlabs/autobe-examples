import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeOrganizationMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationMembership";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_organization_memberships_create } from "../../../generate/generate_random_erp_hrm_time_member_organization_memberships_create";
import { prepare_random_erp_hrm_time_organization_membership } from "../../../prepare/prepare_random_erp_hrm_time_organization_membership";

export async function test_api_employee_status_deactivate_already_deactivated(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      displayName: RandomGenerator.name(),
      href: "https://example.com/erp/hrm",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const employeeConnection: api.IConnection = { host: connection.host };
  employeeConnection.headers = {
    Authorization: joined.token.access,
  };
  const first =
    await api.functional.erpHrmTime.member.status.deactivate.deactivateStatus(
      employeeConnection,
      {
        body: {} satisfies IErpHrmTimeEmployeeDashboardSummary.IUpdate,
      },
    );
  typia.assert(first);
  TestValidator.equals(
    "employee is deactivated after first call",
    first.status,
    "deactivated",
  );
  await TestValidator.httpError(
    "second deactivation is rejected",
    [400, 409],
    async () => {
      await api.functional.erpHrmTime.member.status.deactivate.deactivateStatus(
        employeeConnection,
        {
          body: {} satisfies IErpHrmTimeEmployeeDashboardSummary.IUpdate,
        },
      );
    },
  );
  TestValidator.equals(
    "employee remains deactivated after rejected retry",
    first.status,
    "deactivated",
  );
}
