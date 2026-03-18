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

export async function test_api_administrator_request_queue_review(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  const queue =
    await api.functional.shoppingMall.administrator.administrator_requests.index(
      administratorConnection,
      {
        body: {
          status: "pending",
          applicantType: null,
          keyword: null,
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "desc",
        } satisfies IShoppingMallAdministratorRequest.IRequest,
      },
    );
  typia.assert<IPageIShoppingMallAdministratorRequest.ISummary>(queue);
  typia.assert<IPage.IPagination>(queue.pagination);
  TestValidator.predicate(
    "pagination current page is positive",
    queue.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    queue.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records are non-negative",
    queue.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    queue.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page size does not exceed the requested limit",
    queue.data.length <= 10,
  );
  for (const item of queue.data) {
    typia.assert<IShoppingMallAdministratorRequest.ISummary>(item);
    TestValidator.equals(
      "returned status matches the pending queue",
      item.status,
      "pending",
    );
    TestValidator.predicate(
      "request id is a uuid-like value",
      item.id.length > 0,
    );
    TestValidator.predicate(
      "request reason is not empty",
      item.reason.length > 0,
    );
  }
  TestValidator.predicate(
    "authorization token was issued for the administrator session",
    authorized.token.access.length > 0 && authorized.token.refresh.length > 0,
  );
}
