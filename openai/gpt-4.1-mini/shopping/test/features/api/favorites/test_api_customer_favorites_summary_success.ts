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
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";
import { prepare_random_shopping_mall_sale_favorite } from "../../../prepare/prepare_random_shopping_mall_sale_favorite";

export async function test_api_customer_favorites_summary_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and logs in
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, { body: {} });
  typia.assert(seller);
  // 2. Seller creates a sale
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      body: {
        name: `Test Sale ${RandomGenerator.alphabets(5)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<number & tags.Type<"double">>(),
      },
    },
  );
  typia.assert(sale);
  // 3. Customer joins and logs in
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, { body: {} });
  typia.assert(customer);
  // 4. Confirm that favorites summary is empty initially
  const emptySummary =
    await api.functional.shoppingMall.customer.favorites.summary.index(
      customerConnection,
      {
        body: { page: 1, limit: 10 },
      },
    );
  typia.assert(emptySummary);
  TestValidator.equals(
    "initial favorites count",
    emptySummary.pagination.records,
    0,
  );
  TestValidator.equals(
    "initial favorites data length",
    emptySummary.data.length,
    0,
  );
  // 5. Customer adds the sale to favorites
  const favorite =
    await generate_random_shopping_mall_customer_sales_favorites_create_favorite(
      customerConnection,
      {
        body: { shoppingMallSaleId: sale.id },
      },
    );
  typia.assert(favorite);
  // 6. Retrieve favorites summary after adding one favorite
  const favoritesSummary =
    await api.functional.shoppingMall.customer.favorites.summary.index(
      customerConnection,
      {
        body: { page: 1, limit: 10 },
      },
    );
  typia.assert(favoritesSummary);
  // 7. Validate pagination info
  TestValidator.predicate(
    "pagination current page is 1",
    favoritesSummary.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    favoritesSummary.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records >= 1",
    favoritesSummary.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    favoritesSummary.pagination.pages >= 1,
  );
  // 8. Validate favorites data
  TestValidator.predicate(
    "favorites data length >= 1",
    favoritesSummary.data.length >= 1,
  );
  // Find our favorite in data
  const foundFavorite = favoritesSummary.data.find(
    (item) => item.id === favorite.id,
  );
  TestValidator.predicate(
    "added favorite found in summary",
    foundFavorite !== undefined,
  );
  if (foundFavorite) {
    typia.assert(foundFavorite);
    // Validate favorite details
    TestValidator.equals(
      "favorite customer ID matches",
      foundFavorite.customer.id,
      customer.id,
    );
    TestValidator.equals(
      "favorite sale ID matches",
      foundFavorite.sale.id,
      sale.id,
    );
    // Validate sale summary within favorite
    const saleSummary = foundFavorite.sale;
    TestValidator.predicate(
      "sale name is string",
      typeof saleSummary.name === "string",
    );
    TestValidator.predicate(
      "sale base price is number",
      typeof saleSummary.basePrice === "number",
    );
    TestValidator.predicate(
      "sale status is string",
      typeof saleSummary.status === "string",
    );
    // Validate category summary within sale
    const category = saleSummary.category;
    TestValidator.predicate(
      "category id format UUID",
      /^[0-9a-fA-F-]{36}$/.test(category.id),
    );
    TestValidator.predicate(
      "category name is string",
      typeof category.name === "string",
    );
    // Validate seller summary within sale
    const sellerInSale = saleSummary.seller;
    TestValidator.equals(
      "seller ID in sale matches",
      sellerInSale.id,
      seller.id,
    );
    TestValidator.predicate(
      "seller email is string",
      typeof sellerInSale.email === "string",
    );
  }
  // 9. Test search filter returns only matching favorites by saleId
  const filteredBySale =
    await api.functional.shoppingMall.customer.favorites.summary.index(
      customerConnection,
      {
        body: { saleId: sale.id, page: 1, limit: 10 },
      },
    );
  typia.assert(filteredBySale);
  TestValidator.predicate(
    "filter by saleId returns only matching favorites",
    filteredBySale.data.every((item) => item.sale.id === sale.id),
  );
  // 10. Test pagination limits the results
  // Add more favorites if possible
  for (let i = 0; i < 5; ++i) {
    // Create additional sales and favorite them for the same customer
    const extraSale = await generate_random_shopping_mall_seller_sales_create(
      sellerConnection,
      {
        body: {
          name: `Extra Sale ${RandomGenerator.alphabets(5)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          base_price: typia.random<number & tags.Type<"double">>(),
        },
      },
    );
    typia.assert(extraSale);
    const extraFavorite =
      await generate_random_shopping_mall_customer_sales_favorites_create_favorite(
        customerConnection,
        {
          body: { shoppingMallSaleId: extraSale.id },
        },
      );
    typia.assert(extraFavorite);
  }
  const pagedSummary =
    await api.functional.shoppingMall.customer.favorites.summary.index(
      customerConnection,
      {
        body: { page: 1, limit: 3 },
      },
    );
  typia.assert(pagedSummary);
  TestValidator.predicate(
    "pagination limit is 3",
    pagedSummary.pagination.limit === 3,
  );
  TestValidator.predicate(
    "favorites data length is 3",
    pagedSummary.data.length === 3,
  );
  // Ensure all favorites belong to the customer
  TestValidator.predicate(
    "all favorites belong to the customer",
    pagedSummary.data.every((item) => item.customer.id === customer.id),
  );
}
