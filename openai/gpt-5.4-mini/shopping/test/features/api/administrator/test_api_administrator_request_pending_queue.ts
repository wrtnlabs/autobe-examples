import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_request_pending_queue(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  const body = {
    status: "pending",
    applicantType: null,
    keyword: null,
    page: 1,
    limit: 5,
    sort: "created_at",
    order: "desc",
  } satisfies IShoppingMallAdministratorRequest.IRequest;
  const output =
    await api.functional.shoppingMall.administrator.administrator_requests.pending.index(
      adminConnection,
      {
        body,
      },
    );
  typia.assert(output);
  TestValidator.equals("current page", output.pagination.current, 1);
  TestValidator.equals("limit", output.pagination.limit, 5);
  TestValidator.predicate(
    "total records non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "all returned requests are pending",
    output.data.every((item) => item.status === "pending"),
  );
  TestValidator.predicate(
    "created_at and updated_at are ordered",
    output.data.every((item) => item.created_at <= item.updated_at),
  );
}
