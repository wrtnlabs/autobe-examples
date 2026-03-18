import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";

export async function test_api_timelog_delete_other_employee_forbidden(
  connection: api.IConnection,
): Promise<void> {
  const firstEmployeeConnection: api.IConnection = { host: connection.host };
  const firstEmployee = await authorize_employee_join(firstEmployeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  typia.assert(firstEmployee);
  const secondEmployeeConnection: api.IConnection = { host: connection.host };
  const secondEmployee = await authorize_employee_join(
    secondEmployeeConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmTimeTrackingEmployee.IJoin,
    },
  );
  typia.assert(secondEmployee);
  TestValidator.notEquals(
    "employees must be distinct identities",
    firstEmployee.id,
    secondEmployee.id,
  );
  TestValidator.notEquals(
    "employee access tokens must differ",
    firstEmployee.token.access,
    secondEmployee.token.access,
  );
  const foreignTimelogId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "employee cannot delete another employee timelog",
    [403, 404],
    async () => {
      await api.functional.hrmTimeTracking.employee.timelogs.erase(
        firstEmployeeConnection,
        {
          timelogId: foreignTimelogId,
        },
      );
    },
  );
}
