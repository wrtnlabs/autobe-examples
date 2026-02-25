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

export async function test_api_customer_sales_favorites_add_duplicate_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "sellerpassword",
    shopName: RandomGenerator.name(),
    shopDescription: null,
    logoUri: null,
  };
  const seller = await authorize_seller_join(sellerConnection, {
    body: sellerJoinBody,
  });
  typia.assert(seller);
  // 2. Seller logs in
  const sellerLoginBody: IShoppingMallSeller.ILogin = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
  };
  await authorize_seller_login(sellerConnection, {
    body: sellerLoginBody,
  });
  // 3. Seller creates a sale product
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      body: {},
    },
  );
  typia.assert(sale);
  // 4. Customer joins
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "customerpassword",
  };
  const customer = await authorize_customer_join(customerConnection, {
    body: customerJoinBody,
  });
  typia.assert(customer);
  // 5. Customer logs in
  const customerLoginBody: IShoppingMallCustomer.ILogin = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
  };
  await authorize_customer_login(customerConnection, {
    body: customerLoginBody,
  });
  // 6. Customer adds the sale product to favorites successfully
  const favorite =
    await generate_random_shopping_mall_customer_sales_favorites_create_favorite(
      customerConnection,
      {
        body: { shoppingMallSaleId: sale.id },
      },
    );
  typia.assert(favorite);
  // 7. Attempt to add the same sale product to favorites again, expect an error
  await TestValidator.error(
    "duplicate favorite should be rejected",
    async () => {
      await generate_random_shopping_mall_customer_sales_favorites_create_favorite(
        customerConnection,
        {
          body: { shoppingMallSaleId: sale.id },
        },
      );
    },
  );
}
