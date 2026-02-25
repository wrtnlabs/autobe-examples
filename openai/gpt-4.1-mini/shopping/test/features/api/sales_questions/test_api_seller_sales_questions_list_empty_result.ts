import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleQuestion";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_sales_questions_list_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SafePass123!",
      shopName: "Test Shop",
      shopDescription: null,
      logoUri: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  // Update sellerConnection headers to use the obtained token
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuthorized.token.access}`,
  };
  // 2. Call the sales questions list with filters that guarantee empty result
  // For example, a future date range for createdAtFrom that excludes any question
  const futureDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString();
  const emptyFilter: IShoppingMallSaleQuestion.IRequest = {
    status: "nonexistent_status", // Status that presumably does not exist
    createdAtFrom: futureDate,
    createdAtTo: futureDate,
    updatedAtFrom: futureDate,
    updatedAtTo: futureDate,
    search: "random-nonmatching-search-term",
    page: 1,
    limit: 10,
  };
  const result = await api.functional.shoppingMall.seller.sales.questions.index(
    sellerConnection,
    { body: emptyFilter },
  );
  typia.assert(result);
  // 3. Validate empty result structure
  TestValidator.equals("empty data length", result.data.length, 0);
  TestValidator.equals("pagination.records", result.pagination.records, 0);
  TestValidator.equals("pagination.pages", result.pagination.pages, 0);
  TestValidator.equals("pagination.current", result.pagination.current, 1);
  TestValidator.equals("pagination.limit", result.pagination.limit, 10);
}
