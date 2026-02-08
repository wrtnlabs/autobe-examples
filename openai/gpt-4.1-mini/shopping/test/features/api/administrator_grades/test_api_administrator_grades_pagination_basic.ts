import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorGrade";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_grades_pagination_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator and obtain authorized connection
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(
    adminJoinConnection,
    {
      body: {},
    },
  );
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${adminAuthorized.token.access}`,
    },
  };
  // Test unauthorized access: no auth headers
  await TestValidator.httpError(
    "unauthorized access is rejected",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.administrator.grades.index(
        { host: connection.host },
        { body: {} },
      );
    },
  );
  // Prepare empty filter request body
  const requestBody: IShoppingMallAdministratorGrade.IRequest = {};
  // Call the endpoint with authorized connection
  const result: IPageIShoppingMallAdministratorGrade.ISummary =
    await api.functional.shoppingMall.administrator.administrator.grades.index(
      adminConnection,
      {
        body: requestBody,
      },
    );
  // Full structural validation
  typia.assert(result);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination.current is a positive integer",
    typeof result.pagination.current === "number" &&
      result.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination.limit is a non-negative integer",
    typeof result.pagination.limit === "number" && result.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is a non-negative integer",
    typeof result.pagination.records === "number" &&
      result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is a non-negative integer",
    typeof result.pagination.pages === "number" && result.pagination.pages >= 0,
  );
  // Validate data array length does not exceed limit
  TestValidator.predicate(
    "data length does not exceed limit",
    result.data.length <= result.pagination.limit,
  );
  // Cannot validate individual grade fields because ISummary is empty in DTO
  // Validate pagination counts consistency
  const expectedPages =
    result.pagination.limit > 0
      ? Math.ceil(result.pagination.records / result.pagination.limit)
      : 0;
  TestValidator.equals(
    "pagination.pages matches expected",
    result.pagination.pages,
    expectedPages,
  );
  // Validate current page in valid range
  TestValidator.predicate(
    "pagination.current page within valid range",
    result.pagination.current >= 1 &&
      (result.pagination.pages === 0 ||
        result.pagination.current <= result.pagination.pages),
  );
}
