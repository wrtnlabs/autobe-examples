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

export async function test_api_administrator_sale_questions_list_pagination(
  connection: api.IConnection,
) {
  // 1. Administrator joins and obtains authorization token
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {} satisfies IShoppingMallAdministrator.IJoin,
    });
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Call the PATCH /shoppingMall/administrator/sale-questions endpoint without any filters for default pagination
  const response: IPageIShoppingMallSaleQuestion.ISummary =
    await api.functional.shoppingMall.administrator.sale_questions.index(
      adminConnection,
      { body: {} satisfies IShoppingMallSaleQuestion.IRequest },
    );
  // 3. Assert the response matches the expected type
  typia.assert(response);
  // 4. Check that pagination metadata has valid default current page and limit
  TestValidator.predicate(
    "pagination current page >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    response.pagination.limit > 0,
  );
  // 5. Check that data array is an array
  TestValidator.predicate(
    "response data is array",
    Array.isArray(response.data),
  );
  // 6. Optional: Check all data entries are valid summaries
  response.data.forEach((item, i) => {
    try {
      typia.assert(item);
    } catch (err) {
      throw new Error(`Invalid sale question summary at index ${i}`);
    }
  });
  // 7. Authorization enforcement check: base connection access should fail
  await TestValidator.error(
    "unauthorized access with base connection",
    async () => {
      await api.functional.shoppingMall.administrator.sale_questions.index(
        connection,
        { body: {} satisfies IShoppingMallSaleQuestion.IRequest },
      );
    },
  );
}
