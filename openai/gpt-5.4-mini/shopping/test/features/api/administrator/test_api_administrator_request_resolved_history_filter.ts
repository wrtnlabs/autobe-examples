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

export async function test_api_administrator_request_resolved_history_filter(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(authorized);
  const resolvedQuery = {
    status: "approved",
    applicantType: "customer",
    keyword: RandomGenerator.alphabets(8),
    page: 1,
    limit: 20,
    sort: "created_at",
    order: "desc",
  } satisfies IShoppingMallAdministratorRequest.IRequest;
  const response =
    await api.functional.shoppingMall.administrator.administrator_requests.index(
      adminConnection,
      {
        body: resolvedQuery,
      },
    );
  typia.assert(response);
  const repeated =
    await api.functional.shoppingMall.administrator.administrator_requests.index(
      adminConnection,
      {
        body: resolvedQuery,
      },
    );
  typia.assert(repeated);
  TestValidator.equals(
    "pagination current page should echo the request page",
    response.pagination.current,
    resolvedQuery.page,
  );
  TestValidator.equals(
    "pagination limit should echo the request limit",
    response.pagination.limit,
    resolvedQuery.limit,
  );
  TestValidator.predicate(
    "pagination record count should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count should be non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "resolved history list should not exceed requested limit",
    response.data.length <= resolvedQuery.limit,
  );
  TestValidator.predicate(
    "all returned requests should be historical approval or rejection records",
    response.data.every(
      (item) => item.status === "approved" || item.status === "rejected",
    ),
  );
  TestValidator.equals(
    "repeated query should return the same pagination metadata",
    repeated.pagination,
    response.pagination,
  );
  TestValidator.equals(
    "repeated query should return the same data payload",
    repeated.data,
    response.data,
  );
  const sellerResponse =
    await api.functional.shoppingMall.administrator.administrator_requests.index(
      adminConnection,
      {
        body: {
          status: "rejected",
          applicantType: "seller",
          keyword: resolvedQuery.keyword,
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "desc",
        } satisfies IShoppingMallAdministratorRequest.IRequest,
      },
    );
  typia.assert(sellerResponse);
  TestValidator.equals(
    "seller filter pagination current should be 1",
    sellerResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "seller filter pagination limit should echo the request limit",
    sellerResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "seller historical requests should be returned in a paginated list",
    sellerResponse.pagination.records >= sellerResponse.data.length,
  );
  const keywordResponse =
    await api.functional.shoppingMall.administrator.administrator_requests.index(
      adminConnection,
      {
        body: {
          status: null,
          applicantType: null,
          keyword: resolvedQuery.keyword,
          page: 1,
          limit: 5,
          sort: "created_at",
          order: "desc",
        } satisfies IShoppingMallAdministratorRequest.IRequest,
      },
    );
  typia.assert(keywordResponse);
  TestValidator.predicate(
    "keyword search should return a valid page object even when narrowed",
    keywordResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "keyword search should not exceed requested limit",
    keywordResponse.data.length <= 5,
  );
}
