import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import type { IHrmTimeTrackingManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingEmployeeContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_manager_join } from "../../../authorize/authorize_manager_join";
import { authorize_manager_login } from "../../../authorize/authorize_manager_login";
import { authorize_manager_refresh } from "../../../authorize/authorize_manager_refresh";

export async function test_api_employee_contract_history_manager_timeline_view(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmTimeTrackingManager.IAuthorized =
    await authorize_manager_join(managerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(authorized);
  const body = {
    page: 1,
    limit: 20,
    sort: "start_date",
    direction: "desc",
  } satisfies IHrmTimeTrackingEmployeeContract.IRequest;
  await TestValidator.httpError(
    "manager cannot browse contract history for an arbitrary unprepared employee",
    [400, 401, 403, 404],
    async () => {
      await api.functional.hrmTimeTracking.manager.employees.contracts.index(
        managerConnection,
        {
          employeeId: typia.random<string & tags.Format<"uuid">>(),
          body,
        },
      );
    },
  );
}
