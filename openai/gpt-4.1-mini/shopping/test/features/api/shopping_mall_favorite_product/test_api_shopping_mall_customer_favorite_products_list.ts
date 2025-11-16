import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallFavoriteProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallFavoriteProduct";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallFavoriteProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteProduct";

export async function test_api_shopping_mall_customer_favorite_products_list(
  connection: api.IConnection,
) {
  // 1. Customer joins (register)
  const email = `user.${RandomGenerator.alphaNumeric(6)}@example.com`;
  const fullName = RandomGenerator.name();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email,
        password: "password123",
        full_name: fullName,
        ip: null,
        href: "https://test.example.com/signup",
        referrer: "https://referrer.example.com/page",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);
  TestValidator.predicate(
    "customer joined has an access token",
    typeof customer.token.access === "string" &&
      customer.token.access.length > 0,
  );

  // 2. Test favorite products list with default parameters
  const defaultResponse =
    await api.functional.shoppingMall.customer.shoppingMall.favoriteProducts.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(defaultResponse);
  TestValidator.predicate(
    "default response has data array",
    Array.isArray(defaultResponse.data),
  );
  TestValidator.predicate(
    "default response has pagination object",
    defaultResponse.pagination !== null &&
      typeof defaultResponse.pagination === "object",
  );

  // 3. Test favorite products list with pagination parameters
  const pagingResponse =
    await api.functional.shoppingMall.customer.shoppingMall.favoriteProducts.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallFavoriteProduct.IRequest,
      },
    );
  typia.assert(pagingResponse);
  TestValidator.equals(
    "paging response page is current page",
    pagingResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "paging response data length equals or less than limit",
    pagingResponse.data.length <= 10,
  );

  // 4. Test favorite products list sorting by name ascending
  const sortedNameAsc =
    await api.functional.shoppingMall.customer.shoppingMall.favoriteProducts.index(
      connection,
      {
        body: {
          sortBy: "name",
          sortOrder: "asc",
          limit: 5,
        } satisfies IShoppingMallFavoriteProduct.IRequest,
      },
    );
  typia.assert(sortedNameAsc);
  // Validate sorted order
  for (let i = 1; i < sortedNameAsc.data.length; i++) {
    TestValidator.predicate(
      "sorted ascending by name",
      sortedNameAsc.data[i - 1].productName <=
        sortedNameAsc.data[i].productName,
    );
  }

  // 5. Test favorite products list sorting by createdAt descending
  const sortedCreatedDesc =
    await api.functional.shoppingMall.customer.shoppingMall.favoriteProducts.index(
      connection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "desc",
          limit: 5,
        } satisfies IShoppingMallFavoriteProduct.IRequest,
      },
    );
  typia.assert(sortedCreatedDesc);
  for (let i = 1; i < sortedCreatedDesc.data.length; i++) {
    TestValidator.predicate(
      "sorted descending by createdAt",
      sortedCreatedDesc.data[i - 1].addedAt >=
        sortedCreatedDesc.data[i].addedAt,
    );
  }

  // 6. Test favorite products list with a search term
  if (defaultResponse.data.length > 0) {
    const searchTerm = defaultResponse.data[0].productName.slice(0, 3);
    const searchResponse =
      await api.functional.shoppingMall.customer.shoppingMall.favoriteProducts.index(
        connection,
        {
          body: {
            search: searchTerm,
            limit: 10,
          } satisfies IShoppingMallFavoriteProduct.IRequest,
        },
      );
    typia.assert(searchResponse);
    // All returned product names should include search term
    for (const product of searchResponse.data) {
      TestValidator.predicate(
        "search term found in product name",
        product.productName.includes(searchTerm),
      );
    }
  }
}
