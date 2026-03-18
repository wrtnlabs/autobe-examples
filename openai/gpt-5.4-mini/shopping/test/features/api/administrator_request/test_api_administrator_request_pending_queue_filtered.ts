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

export async function test_api_administrator_request_pending_queue_filtered(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(authorized);
  const administratorConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const request = {
    status: "pending",
    applicantType: null,
    keyword: RandomGenerator.alphabets(6),
    page: 1,
    limit: 10,
    sort: "created_at",
    order: "desc",
  } satisfies IShoppingMallAdministratorRequest.IRequest;
  const output =
    await api.functional.shoppingMall.administrator.administrator_requests.pending.index(
      administratorConnection,
      { body: request },
    );
  typia.assert(output);
  TestValidator.equals(
    "pending queue current page",
    output.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pending queue limit",
    output.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "pending queue records are non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pending queue pages are non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pending queue returns only pending records",
    output.data.every((item) => item.status === "pending"),
  );
  TestValidator.predicate(
    "pending queue result size respects page limit",
    output.data.length <= request.limit,
  );
  TestValidator.predicate(
    "pending queue summaries have stable timestamps",
    output.data.every((item) => item.created_at <= item.updated_at),
  );
}
