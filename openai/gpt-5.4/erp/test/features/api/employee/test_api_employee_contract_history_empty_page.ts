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

export async function test_api_employee_contract_history_empty_page(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingOwner.IJoin,
  });
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const request = {
    page: 1,
    limit: 20,
    sort: "start_date",
    direction: "desc",
  } satisfies IHrmTimeTrackingEmployeeContract.IRequest;
  const response =
    await api.functional.hrmTimeTracking.owner.employees.contracts.index(
      ownerConnection,
      {
        employeeId,
        body: request,
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page data does not exceed limit",
    response.data.length <= response.pagination.limit,
  );
  if (response.data.length === 0) {
    TestValidator.equals(
      "empty result has zero records",
      response.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty result has zero pages",
      response.pagination.pages,
      0,
    );
    TestValidator.equals(
      "empty result keeps requested page",
      response.pagination.current,
      request.page,
    );
    TestValidator.equals(
      "empty result keeps requested limit",
      response.pagination.limit,
      request.limit,
    );
  }
}
