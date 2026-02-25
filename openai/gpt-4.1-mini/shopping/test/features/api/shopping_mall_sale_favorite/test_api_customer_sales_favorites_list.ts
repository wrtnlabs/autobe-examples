import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleFavorite";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleFavorite";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";

export async function test_api_customer_sales_favorites_list(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving a paginated list of favorite sales for an authenticated customer.
  // 1. Customer and seller join
  // 2. Seller creates a sale listing
  // 3. Customer ensures login and tries various pagination, filter, sorting queries
  // 4. Validate response structure and business logic
  // Create customer connection and join
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "securePass1234",
  } satisfies IShoppingMallCustomer.IJoin;
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: customerJoinBody,
  });
  // Create seller connection and join
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "securePass1234",
    shopName: RandomGenerator.name(1),
    shopDescription: null,
    logoUri: null,
  } satisfies IShoppingMallSeller.IJoin;
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: sellerJoinBody,
  });
  // Seller creates a sale listing as prerequisite
  const saleCreateInput: Partial<IShoppingMallSale.ICreate> = {};
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      body: saleCreateInput,
    },
  );
  // Customer re-login to ensure fresh token for security
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerJoinBody.email,
      password: customerJoinBody.password,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // ======================= Access control test =======================
  // Attempt to access favorites without auth (simulate by empty token)
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("access forbidden without token", async () => {
    await api.functional.shoppingMall.customer.sales.favorites.index(
      unauthenticatedConnection,
      {
        body: {},
      },
    );
  });
  // ======================= Basic pagination test =======================
  // Request page 1 with limit 10
  const page1Response =
    await api.functional.shoppingMall.customer.sales.favorites.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          customerId: authorizedCustomer.id,
        } satisfies IShoppingMallSaleFavorite.IRequest,
      },
    );
  typia.assert(page1Response);
  // Validate pagination metadata
  TestValidator.predicate(
    "page1 current=1",
    page1Response.pagination.current === 1,
  );
  TestValidator.predicate(
    "page1 limit=10",
    page1Response.pagination.limit === 10,
  );
  TestValidator.predicate(
    "page1 records>=0",
    page1Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page1 pages>=0",
    page1Response.pagination.pages >= 0,
  );
  // All returned favorites belong to the authorized customer
  page1Response.data.forEach((favorite) => {
    typia.assert(favorite);
    TestValidator.equals(
      "favorite customerId matches",
      favorite.customer.id,
      authorizedCustomer.id,
    );
  });
  // ======================= Filter by saleId existing =======================
  if (page1Response.data.length > 0) {
    const targetSaleId = page1Response.data[0].sale.id;
    const filteredResponse =
      await api.functional.shoppingMall.customer.sales.favorites.index(
        customerConnection,
        {
          body: {
            saleId: targetSaleId,
            customerId: authorizedCustomer.id,
          } satisfies IShoppingMallSaleFavorite.IRequest,
        },
      );
    typia.assert(filteredResponse);
    filteredResponse.data.forEach((fav) => {
      TestValidator.equals("filter saleId matches", fav.sale.id, targetSaleId);
      TestValidator.equals(
        "favorite customerId matches",
        fav.customer.id,
        authorizedCustomer.id,
      );
    });
  }
  // ======================= Filter by non-existent saleId =======================
  const fakeUuid = typia.random<string & tags.Format<"uuid">>();
  const nonExistentSaleIdResponse =
    await api.functional.shoppingMall.customer.sales.favorites.index(
      customerConnection,
      {
        body: {
          saleId: fakeUuid,
          customerId: authorizedCustomer.id,
        } satisfies IShoppingMallSaleFavorite.IRequest,
      },
    );
  typia.assert(nonExistentSaleIdResponse);
  TestValidator.equals(
    "non-existent saleId returns empty",
    nonExistentSaleIdResponse.data.length,
    0,
  );
  // ======================= Filter by search term =======================
  // Using a substring of the existing sale name if available
  if (page1Response.data.length > 0) {
    const saleName = page1Response.data[0].sale.name;
    const searchTerm =
      saleName.length > 3 ? saleName.substring(0, 3) : saleName;
    const searchResponse =
      await api.functional.shoppingMall.customer.sales.favorites.index(
        customerConnection,
        {
          body: {
            search: searchTerm,
            customerId: authorizedCustomer.id,
          } satisfies IShoppingMallSaleFavorite.IRequest,
        },
      );
    typia.assert(searchResponse);
    searchResponse.data.forEach((fav) => {
      TestValidator.predicate(
        `search term "${searchTerm}" included in sale name`,
        fav.sale.name.includes(searchTerm),
      );
      TestValidator.equals(
        "favorite customerId matches",
        fav.customer.id,
        authorizedCustomer.id,
      );
    });
  }
  // ======================= Sorting tests =======================
  // Sorting by created_at asc
  const sortedCreatedAtAsc =
    await api.functional.shoppingMall.customer.sales.favorites.index(
      customerConnection,
      {
        body: {
          sort: "created_at",
          customerId: authorizedCustomer.id,
          page: 1,
          limit: 5,
        } satisfies IShoppingMallSaleFavorite.IRequest,
      },
    );
  typia.assert(sortedCreatedAtAsc);
  for (let i = 1; i < sortedCreatedAtAsc.data.length; i++) {
    TestValidator.predicate(
      "sorted created_at asc",
      sortedCreatedAtAsc.data[i].createdAt >=
        sortedCreatedAtAsc.data[i - 1].createdAt,
    );
    TestValidator.equals(
      "customerId matches sorted asc",
      sortedCreatedAtAsc.data[i].customer.id,
      authorizedCustomer.id,
    );
  }
  // Sorting by updated_at desc
  const sortedUpdatedAtDesc =
    await api.functional.shoppingMall.customer.sales.favorites.index(
      customerConnection,
      {
        body: {
          sort: "updated_at",
          customerId: authorizedCustomer.id,
          page: 1,
          limit: 5,
        } satisfies IShoppingMallSaleFavorite.IRequest,
      },
    );
  typia.assert(sortedUpdatedAtDesc);
  for (let i = 1; i < sortedUpdatedAtDesc.data.length; i++) {
    TestValidator.predicate(
      "sorted updated_at desc",
      sortedUpdatedAtDesc.data[i].updatedAt <=
        sortedUpdatedAtDesc.data[i - 1].updatedAt,
    );
    TestValidator.equals(
      "customerId matches sorted desc",
      sortedUpdatedAtDesc.data[i].customer.id,
      authorizedCustomer.id,
    );
  }
  // Sorting by deleted_at asc
  const sortedDeletedAtAsc =
    await api.functional.shoppingMall.customer.sales.favorites.index(
      customerConnection,
      {
        body: {
          sort: "deleted_at",
          customerId: authorizedCustomer.id,
          page: 1,
          limit: 5,
        } satisfies IShoppingMallSaleFavorite.IRequest,
      },
    );
  typia.assert(sortedDeletedAtAsc);
  for (let i = 1; i < sortedDeletedAtAsc.data.length; i++) {
    const prev = sortedDeletedAtAsc.data[i - 1].deletedAt ?? "";
    const curr = sortedDeletedAtAsc.data[i].deletedAt ?? "";
    TestValidator.predicate("sorted deleted_at asc", curr >= prev);
    TestValidator.equals(
      "customerId matches sorted deleted_at asc",
      sortedDeletedAtAsc.data[i].customer.id,
      authorizedCustomer.id,
    );
  }
  // ======================= Edge case: empty favorites =======================
  // Create a new customer who has no favorites, then validate empty response
  const emptyCustomerConnection: api.IConnection = { host: connection.host };
  const emptyCustomerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "securePass1234",
  } satisfies IShoppingMallCustomer.IJoin;
  const emptyCustomer = await authorize_customer_join(emptyCustomerConnection, {
    body: emptyCustomerJoinBody,
  });
  const emptyFavoritesResponse =
    await api.functional.shoppingMall.customer.sales.favorites.index(
      emptyCustomerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          customerId: emptyCustomer.id,
        } satisfies IShoppingMallSaleFavorite.IRequest,
      },
    );
  typia.assert(emptyFavoritesResponse);
  TestValidator.predicate(
    "empty favorites data length=0",
    emptyFavoritesResponse.data.length === 0,
  );
  TestValidator.predicate(
    "empty favorites pagination records=0",
    emptyFavoritesResponse.pagination.records === 0,
  );
  TestValidator.predicate(
    "empty favorites pagination pages=0",
    emptyFavoritesResponse.pagination.pages === 0,
  );
  TestValidator.equals(
    "empty favorites pagination limit=10",
    emptyFavoritesResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "empty favorites pagination current=1",
    emptyFavoritesResponse.pagination.current,
    1,
  );
}
