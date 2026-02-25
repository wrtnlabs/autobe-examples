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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";

export async function test_api_customer_sales_questions_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a seller and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SellerPass123",
      shopName: "Test Seller Shop",
      shopDescription: "Shop for authorization test",
      logoUri: null,
    },
  });
  // 2. Create a sale listing as seller
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      body: {
        name: `Test Sale ${Date.now()}`,
        description: "Test product sale for authorization",
        base_price: 1000,
      },
    },
  );
  // 3. Create a customer who is NOT related to the sale
  const otherCustomerConnection: api.IConnection = { host: connection.host };
  const otherCustomer = await authorize_customer_join(otherCustomerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "CustPass123",
    },
  });
  // 4. Attempt to query sale questions without any authentication
  await TestValidator.error("unauthenticated access forbidden", async () => {
    await api.functional.shoppingMall.customer.sales.questions.index(
      connection,
      {
        saleId: sale.id,
        body: {},
      },
    );
  });
  // 5. Attempt to query sale questions as unauthorized customer
  await TestValidator.error(
    "unauthorized customer access forbidden",
    async () => {
      await api.functional.shoppingMall.customer.sales.questions.index(
        otherCustomerConnection,
        {
          saleId: sale.id,
          body: {},
        },
      );
    },
  );
  // 6. Also test querying as seller for completeness (should pass and return data)
  const questionList =
    await api.functional.shoppingMall.customer.sales.questions.index(
      sellerConnection,
      {
        saleId: sale.id,
        body: {},
      },
    );
  typia.assert(questionList);
  TestValidator.predicate(
    "seller can access questions",
    questionList.data !== undefined,
  );
}
