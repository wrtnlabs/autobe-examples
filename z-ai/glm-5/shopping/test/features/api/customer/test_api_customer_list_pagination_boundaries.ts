import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_customer_list_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Test default pagination behavior (no page/limit parameters)
  const defaultResult =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(defaultResult);
  // Validate default pagination metadata
  TestValidator.predicate(
    "default current page is 1",
    defaultResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "default limit is valid",
    defaultResult.pagination.limit >= 1 &&
      defaultResult.pagination.limit <= 100,
  );
  TestValidator.equals(
    "pages calculated correctly for default",
    defaultResult.pagination.pages,
    Math.ceil(
      defaultResult.pagination.records / defaultResult.pagination.limit,
    ) || 0,
  );
  // 3. Test various limit values (1, 10, 50, 100)
  const limitValues = [1, 10, 50, 100] as const;
  for (const limit of limitValues) {
    const result =
      await api.functional.shoppingMall.administrator.customers.index(
        adminConnection,
        {
          body: { page: 1, limit } satisfies IShoppingMallCustomer.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.equals(
      `limit ${limit} - current page`,
      result.pagination.current,
      1,
    );
    TestValidator.equals(
      `limit ${limit} - limit value`,
      result.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `limit ${limit} - data count within limit`,
      result.data.length <= limit,
    );
    TestValidator.equals(
      `limit ${limit} - pages calculation`,
      result.pagination.pages,
      Math.ceil(result.pagination.records / limit) || 0,
    );
  }
  // 4. Test page beyond available data
  const totalRecords = defaultResult.pagination.records;
  const limit = 10;
  const totalPages = Math.ceil(totalRecords / limit) || 0;
  const beyondPage = totalPages + 10;
  const beyondResult =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          page: beyondPage,
          limit,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(beyondResult);
  TestValidator.equals(
    "beyond page - data array is empty",
    beyondResult.data.length,
    0,
  );
  TestValidator.equals(
    "beyond page - current page",
    beyondResult.pagination.current,
    beyondPage,
  );
  TestValidator.equals(
    "beyond page - limit preserved",
    beyondResult.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "beyond page - total records correct",
    beyondResult.pagination.records,
    totalRecords,
  );
  TestValidator.equals(
    "beyond page - total pages correct",
    beyondResult.pagination.pages,
    totalPages,
  );
  // 5. Validate pagination metadata accuracy across different limits
  const testLimit = 7;
  const testResult =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: testLimit,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(testResult);
  TestValidator.equals(
    "metadata records matches total",
    testResult.pagination.records,
    totalRecords,
  );
  TestValidator.equals(
    "metadata pages calculation with limit 7",
    testResult.pagination.pages,
    Math.ceil(totalRecords / testLimit) || 0,
  );
}
