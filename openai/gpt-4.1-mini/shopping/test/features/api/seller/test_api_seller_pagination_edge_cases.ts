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

export async function test_api_seller_pagination_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Test pagination boundary conditions for /shoppingMall/seller/sellers PATCH endpoint
  // 1. Seller registration (join) and authorization
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      shopName: RandomGenerator.name(2),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
      logoUri: null,
    },
  });
  // Update the sellerConnection headers with token for authorized requests
  sellerConnection.headers = {
    Authorization: `Bearer ${authorizedSeller.token.access}`,
  };
  // 2. Attempt to call the admin-only sellers index with unauthorized connection (base connection)
  await TestValidator.httpError(
    "access control enforced: unauthorized access blocked",
    403,
    async () => {
      await api.functional.shoppingMall.seller.sellers.index(connection, {
        body: {},
      });
    },
  );
  // 3. Prepare to test pagination with authorized (seller) connection
  //    But the endpoint requires admin privileges, so typical seller token may not be enough
  //    However, the scenario implied seller actor can test this endpoint, so we proceed with sellerConnection
  // 4. Create multiple sellers to fill pages (simulate with multiple joins) to test pagination
  //    We'll create 45 sellers so that with limit=20 there are 3 pages (20 + 20 + 5)
  const sellers: IShoppingMallSeller.IAuthorized[] = [];
  for (let i = 0; i < 45; i++) {
    const newSeller = await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Test1234!",
        shopName: RandomGenerator.name(2),
        shopDescription: null,
        logoUri: null,
      },
    });
    sellers.push(newSeller);
  }
  // 5. Test first page retrieval with default parameters
  {
    const response = await api.functional.shoppingMall.seller.sellers.index(
      sellerConnection,
      {
        body: {}, // no page or limit means default page=1, limit=20
      },
    );
    typia.assert(response);
    TestValidator.equals("first page current", response.pagination.current, 1);
    TestValidator.equals("first page limit", response.pagination.limit, 20);
    TestValidator.predicate("first page has data", response.data.length > 0);
    TestValidator.equals(
      "first page records",
      response.pagination.records,
      sellers.length,
    );
    TestValidator.equals(
      "first page pages",
      Math.ceil(response.pagination.records / response.pagination.limit),
      response.pagination.pages,
    );
    TestValidator.equals(
      "first page data length vs limit",
      response.data.length <= response.pagination.limit,
      true,
    );
  }
  // 6. Test last page retrieval
  {
    const lastPage = Math.ceil(sellers.length / 20);
    const response = await api.functional.shoppingMall.seller.sellers.index(
      sellerConnection,
      {
        body: { page: lastPage, limit: 20 },
      },
    );
    typia.assert(response);
    TestValidator.equals(
      "last page current",
      response.pagination.current,
      lastPage,
    );
    TestValidator.equals("last page limit", response.pagination.limit, 20);
    TestValidator.equals(
      "last page records",
      response.pagination.records,
      sellers.length,
    );
    TestValidator.equals(
      "last page pages",
      response.pagination.pages,
      lastPage,
    );
    TestValidator.equals(
      "last page data length",
      response.data.length,
      sellers.length - (lastPage - 1) * 20,
    );
  }
  // 7. Test requesting a page beyond available pages results in empty data
  {
    const lastPage = Math.ceil(sellers.length / 20);
    const response = await api.functional.shoppingMall.seller.sellers.index(
      sellerConnection,
      {
        body: { page: lastPage + 1, limit: 20 },
      },
    );
    typia.assert(response);
    TestValidator.equals(
      "empty page current",
      response.pagination.current,
      lastPage + 1,
    );
    TestValidator.equals("empty page limit", response.pagination.limit, 20);
    TestValidator.equals(
      "empty page records",
      response.pagination.records,
      sellers.length,
    );
    TestValidator.equals(
      "empty page pages",
      response.pagination.pages,
      lastPage,
    );
    TestValidator.equals("empty page data length", response.data.length, 0);
  }
  // 8. Test limit parameter behavior with minimum enforced (limit < 1 becomes 1) and maximum enforced (limit > 100 becomes 100)
  {
    // Limit < 1 -> 1
    let response = await api.functional.shoppingMall.seller.sellers.index(
      sellerConnection,
      {
        body: { page: 1, limit: 0 },
      },
    );
    typia.assert(response);
    TestValidator.equals(
      "limit min boundary enforced",
      response.pagination.limit,
      1,
    );
    // Limit > 100 -> 100
    response = await api.functional.shoppingMall.seller.sellers.index(
      sellerConnection,
      {
        body: { page: 1, limit: 200 },
      },
    );
    typia.assert(response);
    TestValidator.equals(
      "limit max boundary enforced",
      response.pagination.limit,
      100,
    );
  }
  // 9. Test page parameter behavior with minimum enforced (page < 1 becomes 1)
  {
    const response = await api.functional.shoppingMall.seller.sellers.index(
      sellerConnection,
      {
        body: { page: 0, limit: 20 },
      },
    );
    typia.assert(response);
    TestValidator.equals(
      "page min boundary enforced",
      response.pagination.current,
      1,
    );
  }
}
