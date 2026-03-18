import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingEmployeeContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_employee_contract_history_cross_organization_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = {
    host: connection.host,
  };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const request = {
    page: 1,
    limit: 10,
    sort: "start_date",
    direction: "desc",
    status: "active",
    startDateFrom: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 365,
    ).toISOString(),
    startDateTo: new Date().toISOString(),
  } satisfies IHrmTimeTrackingEmployeeContract.IRequest;
  await TestValidator.httpError(
    "cross-organization or out-of-scope employee contract history is rejected",
    [403, 404],
    async () => {
      await api.functional.hrmTimeTracking.owner.employees.contracts.index(
        ownerConnection,
        {
          employeeId,
          body: request,
        },
      );
    },
  );
}
