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

export async function test_api_employee_reactivate_status(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(actorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234Abcd!",
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const employee =
    await api.functional.erpHrmTime.member.status.reactivate.reactivateStatus(
      actorConnection,
    );
  typia.assert(employee);
  TestValidator.predicate(
    "employee id should be present",
    employee.id.length > 0,
  );
  TestValidator.predicate(
    "organization linkage should be present",
    employee.erpHrmTimeOrganizationId.length > 0,
  );
  TestValidator.predicate(
    "member linkage should be present",
    employee.erpHrmTimeMemberId.length > 0,
  );
  TestValidator.predicate(
    "role linkage should be present",
    employee.erpHrmTimeRoleId.length > 0,
  );
  TestValidator.predicate(
    "status should be active",
    employee.status === "active",
  );
}
