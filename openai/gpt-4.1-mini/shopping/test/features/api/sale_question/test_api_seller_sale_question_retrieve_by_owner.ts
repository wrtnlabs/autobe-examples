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

export async function test_api_seller_sale_question_retrieve_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller join and login
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerJoinConnection, {
    body: {},
  });
  typia.assert(seller);
  // 2. Seller connection
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: seller.token.access },
  };
  // 3. Create a sale by this seller
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(sale);
  // 4. Customer join and login
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerJoinConnection, {
    body: {},
  });
  typia.assert(customer);
  // 5. Customer connection
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: customer.token.access },
  };
  // 6. Customer creates a question on the sale
  const question =
    await generate_random_shopping_mall_customer_sales_questions_create_question(
      customerConnection,
      {
        params: { saleId: sale.id },
        body: {},
      },
    );
  typia.assert(question);
  // 7. Seller retrieves the question details using the GET endpoint
  const retrievedQuestion =
    await api.functional.shoppingMall.customer.sales.questions.at(
      sellerConnection,
      {
        saleId: sale.id,
        questionId: question.id,
      },
    );
  typia.assert(retrievedQuestion);
  // 8. Assertions: Check full question details
  TestValidator.equals(
    "retrieved question id",
    retrievedQuestion.id,
    question.id,
  );
  TestValidator.equals("sale association", retrievedQuestion.sale.id, sale.id);
  TestValidator.equals(
    "customer association",
    retrievedQuestion.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "question title",
    retrievedQuestion.title,
    question.title,
  );
  TestValidator.equals("question body", retrievedQuestion.body, question.body);
  TestValidator.equals(
    "question status",
    retrievedQuestion.status,
    question.status,
  );
  TestValidator.predicate(
    "createdAt is ISO date time",
    !isNaN(Date.parse(retrievedQuestion.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is ISO date time",
    !isNaN(Date.parse(retrievedQuestion.updatedAt)),
  );
  // 9. Negative test: unauthorized seller (different seller)
  const anotherSellerJoinConnection: api.IConnection = {
    host: connection.host,
  };
  const anotherSeller = await authorize_seller_join(
    anotherSellerJoinConnection,
    { body: {} },
  );
  typia.assert(anotherSeller);
  const anotherSellerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: anotherSeller.token.access },
  };
  await TestValidator.error(
    "unauthorized seller cannot retrieve question",
    async () => {
      await api.functional.shoppingMall.customer.sales.questions.at(
        anotherSellerConnection,
        {
          saleId: sale.id,
          questionId: question.id,
        },
      );
    },
  );
}
