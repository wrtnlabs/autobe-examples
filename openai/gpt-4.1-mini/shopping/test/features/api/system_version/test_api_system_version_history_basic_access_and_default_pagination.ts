import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemVersion";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemVersion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_system_version_history_basic_access_and_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "abcdefgh",
    },
  });
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Prepare empty filters to get default pagination result
  const requestBody: IShoppingMallSystemVersion.IRequest = {};
  // 3. Request system version history
  const response =
    await api.functional.shoppingMall.administrator.systemVersions.history.index(
      adminConnection,
      {
        body: requestBody,
      },
    );
  // 4. Validate the response structure
  typia.assert(response);
  // 5. Access control test - try anonymous access (should fail)
  await TestValidator.httpError(
    "access control enforcement for anonymous",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.systemVersions.history.index(
        connection,
        {
          body: requestBody,
        },
      );
    },
  );
  // 6. Validate pagination metadata - first page, default limit (pageSize 100)
  TestValidator.predicate(
    "pagination current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is between 1 and 100",
    response.pagination.limit >= 1 && response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  // 7. Validate data is an array
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  // 8. Validate data length is less or equal to pageSize
  TestValidator.predicate(
    "data length does not exceed limit",
    response.data.length <= response.pagination.limit,
  );
  // 9. Validate data non-empty (if records > 0)
  if (response.pagination.records > 0) {
    TestValidator.predicate(
      "data non-empty when records > 0",
      response.data.length > 0,
    );
  }
  // 10. Validate sorting by release date descending by default
  for (let i = 1; i < response.data.length; i++) {
    const curr = new Date(response.data[i].createdAt);
    const prev = new Date(response.data[i - 1].createdAt);
    TestValidator.predicate(
      `release date descending check (${i - 1} vs ${i})`,
      prev >= curr,
    );
  }
}
