import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeContract";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
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

export async function test_api_employee_contract_history_view_permission(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const viewerConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {
    body: {
      email: `employee-${RandomGenerator.alphaNumeric(10)}@test.com` as string &
        tags.Format<"email">,
      password: "password1234!" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "http://localhost/register",
      referrer: "http://localhost/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(employee);
  const viewer = await authorize_member_join(viewerConnection, {
    body: {
      email: `viewer-${RandomGenerator.alphaNumeric(10)}@test.com` as string &
        tags.Format<"email">,
      password: "password1234!" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "http://localhost/register",
      referrer: "http://localhost/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(viewer);
  const employeeHistory =
    await api.functional.erpHrmTime.member.employee.contracts.history.index(
      employeeConnection,
    );
  typia.assert(employeeHistory);
  const viewerHistory =
    await api.functional.erpHrmTime.member.employee.contracts.history.index(
      viewerConnection,
    );
  typia.assert(viewerHistory);
  TestValidator.equals(
    "employee and viewer history pages should be valid responses",
    employeeHistory.pagination.current >= 0 &&
      employeeHistory.pagination.limit >= 0 &&
      employeeHistory.pagination.records >= 0 &&
      employeeHistory.pagination.pages >= 0,
    viewerHistory.pagination.current >= 0 &&
      viewerHistory.pagination.limit >= 0 &&
      viewerHistory.pagination.records >= 0 &&
      viewerHistory.pagination.pages >= 0,
  );
  await TestValidator.httpError(
    "unauthenticated access should be denied",
    [401, 403],
    async () => {
      await api.functional.erpHrmTime.member.employee.contracts.history.index({
        host: connection.host,
      });
    },
  );
}
