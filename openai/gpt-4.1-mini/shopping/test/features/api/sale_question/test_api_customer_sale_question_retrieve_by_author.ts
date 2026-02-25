import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_shopping_mall_customer_sales_questions_create_question } from "../../../generate/generate_random_shopping_mall_customer_sales_questions_create_question";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";
import { prepare_random_shopping_mall_sale_question } from "../../../prepare/prepare_random_shopping_mall_sale_question";

export async function test_api_customer_sale_question_retrieve_by_author(
  connection: api.IConnection,
) {
  // 1. Seller joins and logs in
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, { body: {} });
  typia.assert(seller);
  // 2. Seller creates a sale
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {},
  );
  typia.assert(sale);
  // 3. Customer joins and logs in
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, { body: {} });
  typia.assert(customer);
  // 4. Customer creates a sale question linked to the sale
  const question =
    await generate_random_shopping_mall_customer_sales_questions_create_question(
      customerConnection,
      {
        params: { saleId: sale.id },
      },
    );
  typia.assert(question);
  // 5. Customer retrieves the sale question by saleId and questionId
  const questionRetrieved =
    await api.functional.shoppingMall.customer.sales.questions.at(
      customerConnection,
      {
        saleId: sale.id,
        questionId: question.id,
      },
    );
  typia.assert(questionRetrieved);
  // 6. Validate that the retrieved question matches the created question
  TestValidator.equals(
    "retrieved question matches created question",
    questionRetrieved,
    question,
  );
  // 7. Another customer cannot retrieve the question (unauthorized access)
  const otherCustomerConnection: api.IConnection = { host: connection.host };
  const otherCustomer = await authorize_customer_join(
    otherCustomerConnection,
    { body: {} },
  );
  typia.assert(otherCustomer);
  await TestValidator.error(
    "unauthorized customer cannot retrieve question",
    async () => {
      await api.functional.shoppingMall.customer.sales.questions.at(
        otherCustomerConnection,
        {
          saleId: sale.id,
          questionId: question.id,
        },
      );
    },
  );
}
