import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_search_keyword_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller join and authorize
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "strong_password_123",
      shopName: "SuperCool Shop",
      shopDescription: "Best goods for all your needs",
      logoUri: null,
    },
  });
  sellerConnection.headers = { Authorization: seller1.token.access };
  const seller2 = await authorize_seller_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "strong_password_123",
        shopName: "Amazing Deals",
        shopDescription: "Discounts and offers",
        logoUri: null,
      },
    },
  );
  const seller3 = await authorize_seller_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "strong_password_123",
        shopName: "Cool Electronics",
        shopDescription: "Your source for electronics",
        logoUri: null,
      },
    },
  );
  // 2. Seller with admin authority tries searching with keyword in shopName (partial & case-insensitive)
  const keyword1 = "cool"; // should match seller1 and seller3 because 'SuperCool Shop' and 'Cool Electronics'
  const response1 = await api.functional.shoppingMall.seller.sellers.index(
    sellerConnection,
    {
      body: { keyword: keyword1, page: 1, limit: 10 },
    },
  );
  typia.assert(response1);
  // Validate that response data contains seller1 and seller3 only
  TestValidator.predicate(
    "contains seller1",
    response1.data.some((seller) => seller.id === seller1.id),
  );
  TestValidator.predicate(
    "contains seller3",
    response1.data.some((seller) => seller.id === seller3.id),
  );
  TestValidator.predicate(
    "does not contain seller2",
    !response1.data.some((seller) => seller.id === seller2.id),
  );
  // Validate pagination metadata
  TestValidator.equals("page current", response1.pagination.current, 1);
  TestValidator.predicate("page limit > 0", response1.pagination.limit > 0);
  TestValidator.predicate(
    "records >= data length",
    response1.pagination.records >= response1.data.length,
  );
  // 3. Search with keyword in shopDescription (partial & case-insensitive)
  const keyword2 = "discount"; // should match seller2
  const response2 = await api.functional.shoppingMall.seller.sellers.index(
    sellerConnection,
    {
      body: { keyword: keyword2, page: 1, limit: 10 },
    },
  );
  typia.assert(response2);
  TestValidator.predicate(
    "contains seller2",
    response2.data.some((seller) => seller.id === seller2.id),
  );
  // Should not contain seller1 or seller3
  TestValidator.predicate(
    "does not contain seller1",
    !response2.data.some((seller) => seller.id === seller1.id),
  );
  TestValidator.predicate(
    "does not contain seller3",
    !response2.data.some((seller) => seller.id === seller3.id),
  );
  // 4. Search with mixed case keyword
  const keyword3 = "SUPER"; // should match seller1
  const response3 = await api.functional.shoppingMall.seller.sellers.index(
    sellerConnection,
    {
      body: { keyword: keyword3, page: 1, limit: 10 },
    },
  );
  typia.assert(response3);
  TestValidator.predicate(
    "contains seller1",
    response3.data.some((seller) => seller.id === seller1.id),
  );
  // 5. Search with keyword that yields no results
  const keywordNoMatch = "NonExistentKeyword";
  const responseNoMatch =
    await api.functional.shoppingMall.seller.sellers.index(sellerConnection, {
      body: { keyword: keywordNoMatch, page: 1, limit: 10 },
    });
  typia.assert(responseNoMatch);
  TestValidator.equals("no data length", responseNoMatch.data.length, 0);
  // 6. Unauthorized user attempting to search must fail (using base connection)
  await TestValidator.error("unauthorized access", async () => {
    await api.functional.shoppingMall.seller.sellers.index(connection, {
      body: { keyword: keyword1, page: 1, limit: 10 },
    });
  });
}
