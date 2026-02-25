import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_customer_sales_favorites_add_success(
  connection: api.IConnection,
): Promise<void> {
  // Seller join and get authorized connection
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongSellerPass1234",
      shopName: "Test Seller Shop",
      shopDescription: "Test seller shop description",
      logoUri: null,
    },
  });
  typia.assert(seller);
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = { Authorization: seller.token.access };
  // Seller creates a sale
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {},
  );
  typia.assert(sale);
  // Customer join and get authorized connection
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerJoinConnection, {});
  typia.assert(customer);
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = { Authorization: customer.token.access };
  // Customer adds sale to favorites
  const favorite =
    await generate_random_shopping_mall_customer_sales_favorites_create_favorite(
      customerConnection,
      {
        body: {
          shoppingMallSaleId: sale.id,
        },
      },
    );
  typia.assert(favorite);
  // Validate favorite references
  TestValidator.equals(
    "favorite customer id",
    favorite.customer.id,
    customer.id,
  );
  TestValidator.equals("favorite sale id", favorite.sale.id, sale.id);
  TestValidator.equals(
    "favorite customer email",
    favorite.customer.email,
    customer.email,
  );
  TestValidator.equals("favorite sale name", favorite.sale.name, sale.name);
  // Validate timestamps
  TestValidator.predicate(
    "favorite createdAt is non-empty string",
    typeof favorite.createdAt === "string" && favorite.createdAt.length > 0,
  );
  TestValidator.predicate(
    "favorite updatedAt is non-empty string",
    typeof favorite.updatedAt === "string" && favorite.updatedAt.length > 0,
  );
  TestValidator.equals("favorite deletedAt is null", favorite.deletedAt, null);
}
