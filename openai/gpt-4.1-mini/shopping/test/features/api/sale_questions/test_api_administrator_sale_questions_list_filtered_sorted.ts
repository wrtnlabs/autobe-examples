import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleQuestion";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_sale_questions_list_filtered_sorted(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test retrieving sale questions with empty filter and validate pagination and authorization
  // 1. Administrator join and auth
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Request with empty filter since no properties are defined
  const filterBody: IShoppingMallSaleQuestion.IRequest = {};
  // 3. Call endpoint
  const response: IPageIShoppingMallSaleQuestion.ISummary =
    await api.functional.shoppingMall.administrator.sale_questions.index(
      adminConnection,
      { body: filterBody },
    );
  // 4. Validate response type
  typia.assert(response);
  // 5. Pagination validations
  TestValidator.predicate(
    "pagination current page is positive integer",
    typeof response.pagination.current === "number" &&
      response.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive integer",
    typeof response.pagination.limit === "number" &&
      response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records and pages are not negative",
    response.pagination.records >= 0 && response.pagination.pages >= 0,
  );
  // 6. Cannot validate question data properties since none are defined
  // Skipping sale_id, customer_id and sorting field validations
  // 7. Authorization enforcement - unauthorized should fail
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access rejected",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.sale_questions.index(
        unauthConnection,
        { body: filterBody },
      );
    },
  );
}
