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

export async function test_api_customer_sales_question_update_success_ownership_authorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful update of a customer's question by the question's owner
  // Scenario 2: Attempt to update a question by an unauthorized customer (ownership enforcement)
  // Scenario 3: Attempt to update a non-existent question (404 error)
  // Seller joins and logs in
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: { password: sellerPassword },
  });
  typia.assert(sellerAuth);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: { email: sellerAuth.email, password: sellerPassword },
  });
  // Customer A joins and logs in
  const customerAJoinConnection: api.IConnection = { host: connection.host };
  const customerAPassword = RandomGenerator.alphaNumeric(16);
  const customerAAuth = await authorize_customer_join(customerAJoinConnection, {
    body: { password: customerAPassword },
  });
  typia.assert(customerAAuth);
  const customerALoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerALoginConnection, {
    body: { email: customerAAuth.email, password: customerAPassword },
  });
  // Customer B joins and logs in
  const customerBJoinConnection: api.IConnection = { host: connection.host };
  const customerBPassword = RandomGenerator.alphaNumeric(16);
  const customerBAuth = await authorize_customer_join(customerBJoinConnection, {
    body: { password: customerBPassword },
  });
  typia.assert(customerBAuth);
  const customerBLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerBLoginConnection, {
    body: { email: customerBAuth.email, password: customerBPassword },
  });
  // Seller creates a new sale
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerLoginConnection,
    {},
  );
  typia.assert(sale);
  // Customer B posts a new question
  const questionByB =
    await generate_random_shopping_mall_customer_sales_questions_create_question(
      customerBLoginConnection,
      {
        params: { saleId: sale.id },
      },
    );
  typia.assert(questionByB);
  // Scenario 1: Customer B updates their question successfully
  const updateBodyB: IShoppingMallSaleQuestion.IUpdate = {
    title: RandomGenerator.name(3),
    body: RandomGenerator.paragraph({ sentences: 5 }),
    status: "open",
  };
  const updatedQuestionByB =
    await api.functional.shoppingMall.customer.sales.questions.updateQuestion(
      customerBLoginConnection,
      {
        saleId: sale.id,
        questionId: questionByB.id,
        body: updateBodyB,
      },
    );
  typia.assert(updatedQuestionByB);
  TestValidator.equals(
    "update ownership enforced",
    updatedQuestionByB.customer.id,
    customerBAuth.id,
  );
  TestValidator.equals(
    "updated title matches",
    updatedQuestionByB.title,
    updateBodyB.title,
  );
  TestValidator.equals(
    "updated body matches",
    updatedQuestionByB.body,
    updateBodyB.body,
  );
  TestValidator.equals(
    "updated status matches",
    updatedQuestionByB.status,
    updateBodyB.status,
  );
  // Scenario 2: Customer A attempts to update Customer B's question and should fail with 403 forbidden
  await TestValidator.httpError(
    "update forbidden for non-owner",
    403,
    async () => {
      await api.functional.shoppingMall.customer.sales.questions.updateQuestion(
        customerALoginConnection,
        {
          saleId: sale.id,
          questionId: questionByB.id,
          body: updateBodyB,
        },
      );
    },
  );
  // Scenario 3: Update non-existent question returns 404 not found error
  const invalidUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "update non-existent question",
    404,
    async () => {
      await api.functional.shoppingMall.customer.sales.questions.updateQuestion(
        customerALoginConnection,
        {
          saleId: invalidUUID,
          questionId: invalidUUID,
          body: {
            title: RandomGenerator.name(3),
            body: RandomGenerator.paragraph({ sentences: 5 }),
            status: "open",
          },
        },
      );
    },
  );
}
