import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_detail_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234qwer",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
      avatarImageUrl: null,
      phoneNumber: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(ownerAuth);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234qwer",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding-two",
      referrer: "https://example.com/",
      avatarImageUrl: null,
      phoneNumber: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(memberAuth);
  const ownerEmployee = await api.functional.erpHrmTime.member.employees.at(
    ownerConnection,
    {
      employeeId: ownerAuth.id,
    },
  );
  typia.assert(ownerEmployee);
  const memberEmployee = await api.functional.erpHrmTime.member.employees.at(
    memberConnection,
    {
      employeeId: memberAuth.id,
    },
  );
  typia.assert(memberEmployee);
  TestValidator.notEquals(
    "employees should belong to different organizations",
    ownerEmployee.erpHrmTimeOrganizationId,
    memberEmployee.erpHrmTimeOrganizationId,
  );
  await TestValidator.httpError(
    "cross-organization employee detail access should be rejected",
    [403, 404],
    async () => {
      await api.functional.erpHrmTime.member.employees.at(ownerConnection, {
        employeeId: memberEmployee.id,
      });
    },
  );
  await TestValidator.httpError(
    "missing employee should return an error",
    [404],
    async () => {
      await api.functional.erpHrmTime.member.employees.at(ownerConnection, {
        employeeId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
