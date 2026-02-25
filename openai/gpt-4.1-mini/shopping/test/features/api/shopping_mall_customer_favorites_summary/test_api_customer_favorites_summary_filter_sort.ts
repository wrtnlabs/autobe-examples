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
import { generate_random_shopping_mall_customer_sales_favorites_create_favorite } from "../../../generate/generate_random_shopping_mall_customer_sales_favorites_create_favorite";
import { prepare_random_shopping_mall_sale_favorite } from "../../../prepare/prepare_random_shopping_mall_sale_favorite";

export async function test_api_customer_favorites_summary_filter_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate a customer (join + login)
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "pass1234",
    },
  });
  typia.assert(customer);
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customer.email,
      password: "pass1234",
    },
  });
  // 2. Create multiple favorites for this customer with different sales
  const favorites: IShoppingMallSaleFavorite[] = [];
  const favoriteCount = 5;
  for (let i = 0; i < favoriteCount; i++) {
    const favorite =
      await generate_random_shopping_mall_customer_sales_favorites_create_favorite(
        customerConnection,
        { body: {} },
      );
    typia.assert(favorite);
    favorites.push(favorite);
  }
  // 3. Filtering by saleId returns only relevant favorites
  const saleIdToFilter = favorites[1].sale.id;
  const filteredBySaleId =
    await api.functional.shoppingMall.customer.favorites.summary.index(
      customerConnection,
      { body: { saleId: saleIdToFilter } },
    );
  typia.assert(filteredBySaleId);
  filteredBySaleId.data.forEach((fav) => {
    TestValidator.equals("filter by saleId", fav.sale.id, saleIdToFilter);
    TestValidator.equals(
      "belong to the customer",
      fav.customer.id,
      customer.id,
    );
  });
  // 4. Filtering by customerId returns only favorites for that customer
  const filteredByCustomerId =
    await api.functional.shoppingMall.customer.favorites.summary.index(
      customerConnection,
      { body: { customerId: customer.id } },
    );
  typia.assert(filteredByCustomerId);
  filteredByCustomerId.data.forEach((fav) => {
    TestValidator.equals("filter by customerId", fav.customer.id, customer.id);
  });
  // 5. Filtering by search text (on sale name)
  const searchText = favorites[2].sale.name.substring(0, 3);
  const filteredBySearch =
    await api.functional.shoppingMall.customer.favorites.summary.index(
      customerConnection,
      { body: { search: searchText } },
    );
  typia.assert(filteredBySearch);
  filteredBySearch.data.forEach((fav) => {
    TestValidator.predicate(
      "search matches sale name",
      fav.sale.name.includes(searchText),
    );
    TestValidator.equals(
      "belong to the customer",
      fav.customer.id,
      customer.id,
    );
  });
  // 6. Sorting by created_at ascending
  const sortedByCreatedAtAsc =
    await api.functional.shoppingMall.customer.favorites.summary.index(
      customerConnection,
      { body: { sort: "created_at", page: 1, limit: 10 } },
    );
  typia.assert(sortedByCreatedAtAsc);
  for (let i = 1; i < sortedByCreatedAtAsc.data.length; i++) {
    TestValidator.predicate(
      "sorted createdAt asc",
      sortedByCreatedAtAsc.data[i - 1].createdAt <=
        sortedByCreatedAtAsc.data[i].createdAt,
    );
  }
  // 7. Sorting by updated_at descending
  const sortedByUpdatedAtDesc =
    await api.functional.shoppingMall.customer.favorites.summary.index(
      customerConnection,
      { body: { sort: "updated_at", page: 1, limit: 10 } },
    );
  typia.assert(sortedByUpdatedAtDesc);
  for (let i = 1; i < sortedByUpdatedAtDesc.data.length; i++) {
    TestValidator.predicate(
      "sorted updatedAt desc",
      sortedByUpdatedAtDesc.data[i - 1].updatedAt >=
        sortedByUpdatedAtDesc.data[i].updatedAt,
    );
  }
  // 8. Pagination metadata validity
  TestValidator.predicate(
    "pagination current page",
    sortedByCreatedAtAsc.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination total records",
    sortedByCreatedAtAsc.pagination.records >= sortedByCreatedAtAsc.data.length,
  );
  TestValidator.predicate(
    "pagination total pages",
    sortedByCreatedAtAsc.pagination.pages > 0,
  );
  // 9. Edge case: filter by saleId with no results
  const fakeSaleId = "00000000-0000-0000-0000-000000000000" satisfies string &
    tags.Format<"uuid">;
  const emptyResult =
    await api.functional.shoppingMall.customer.favorites.summary.index(
      customerConnection,
      { body: { saleId: fakeSaleId } },
    );
  typia.assert(emptyResult);
  TestValidator.equals("empty data length", emptyResult.data.length, 0);
}
