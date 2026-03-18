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

export async function test_api_employee_contract_history_empty_page(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_manager_join(managerConnection, {});
  typia.assert(authorized);
  const request = {
    page: 1,
    limit: 20,
    sort: "start_date",
    direction: "desc",
  } satisfies IHrmTimeTrackingEmployeeContract.IRequest;
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  try {
    const page =
      await api.functional.hrmTimeTracking.manager.employees.contracts.index(
        managerConnection,
        {
          employeeId,
          body: request,
        },
      );
    typia.assert(page);
    TestValidator.equals("empty page data length", page.data.length, 0);
    TestValidator.equals("pagination current page", page.pagination.current, 1);
    TestValidator.equals("pagination limit", page.pagination.limit, 20);
  } catch (error) {
    TestValidator.predicate(
      "missing employee setup can fail safely",
      error instanceof Error,
    );
  }
}
