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

export async function test_api_employee_reactivate_preserves_history(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(actorConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com` satisfies string &
        tags.Format<"email">,
      password: "Password1234!" satisfies string & tags.Format<"password">,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/signup",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const employee =
    await api.functional.erpHrmTime.member.status.reactivate.reactivateStatus(
      actorConnection,
    );
  typia.assert(employee);
  TestValidator.equals(
    "employee status should be active after reactivation",
    employee.status,
    "active",
  );
  TestValidator.predicate(
    "employee id should be a non-empty string",
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
    "created timestamp should be preserved",
    employee.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updated timestamp should be preserved",
    employee.updatedAt.length > 0,
  );
  TestValidator.equals(
    "employee should not be deleted",
    employee.deletedAt,
    null,
  );
  const reactivatedAgain =
    await api.functional.erpHrmTime.member.status.reactivate.reactivateStatus(
      actorConnection,
    );
  typia.assert(reactivatedAgain);
  TestValidator.equals(
    "second reactivation should not duplicate the employee identity",
    reactivatedAgain.id,
    employee.id,
  );
}
