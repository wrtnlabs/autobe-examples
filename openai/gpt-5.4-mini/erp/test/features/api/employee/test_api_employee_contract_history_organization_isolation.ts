import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeContract";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeEmployeeContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_contract_history_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  const organizationAConnection: api.IConnection = { host: connection.host };
  const organizationAAuthorized = await authorize_member_join(
    organizationAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        displayName: RandomGenerator.name(),
        href: "https://example.com/onboarding/a",
        referrer: "https://example.com/referrer/a",
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  const organizationBConnection: api.IConnection = { host: connection.host };
  const organizationBAuthorized = await authorize_member_join(
    organizationBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        displayName: RandomGenerator.name(),
        href: "https://example.com/onboarding/b",
        referrer: "https://example.com/referrer/b",
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  await TestValidator.httpError(
    "cross-organization contract history must be rejected as not found",
    [404],
    async () => {
      await api.functional.erpHrmTime.member.employees.contracts.index(
        organizationAConnection,
        {
          employeeId: organizationBAuthorized.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies IErpHrmTimeEmployeeContract.IRequest,
        },
      );
    },
  );
}
