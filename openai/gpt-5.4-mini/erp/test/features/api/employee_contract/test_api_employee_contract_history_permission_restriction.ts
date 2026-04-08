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

export async function test_api_employee_contract_history_permission_restriction(
  connection: api.IConnection,
): Promise<void> {
  const requesterConnection: api.IConnection = { host: connection.host };
  const requester = await authorize_member_join(requesterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
      avatarImageUrl: null,
      phoneNumber: null,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(requester);
  const otherConnection: api.IConnection = { host: connection.host };
  const other = await authorize_member_join(otherConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
      avatarImageUrl: null,
      phoneNumber: null,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(other);
  const request: IErpHrmTimeEmployeeContract.IRequest = {
    page: 1,
    limit: 10,
  };
  await TestValidator.httpError(
    "member without employee:view permission cannot access another employee contract history",
    [401, 403, 404],
    async () => {
      await api.functional.erpHrmTime.member.employees.contracts.index(
        requesterConnection,
        {
          employeeId: other.id,
          body: request,
        },
      );
    },
  );
}
