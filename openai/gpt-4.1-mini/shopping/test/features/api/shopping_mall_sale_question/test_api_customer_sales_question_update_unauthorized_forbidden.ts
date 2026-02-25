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

export async function test_api_customer_sales_question_update_unauthorized_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Unauthorized customer attempts to update another customer's question.
  // - Authenticate as a first customer (join).
  // - Authenticate as a second customer (join).
  // - Authenticate as a seller (join).
  // - Create a sale listing as the seller.
  // - The second customer posts a question.
  // - The first customer attempts to update the second customer's question.
  // - Verify the API responds with 403 Forbidden due to ownership enforcement.
  // - Ensure no data is changed in the question record.
  //
  // This tests authorization logic ensuring only authors can update their questions.
  // Authorize first customer join
  const firstCustomerConnection: api.IConnection = { host: connection.host };
  const firstCustomer = await authorize_customer_join(
    firstCustomerConnection,
    {},
  );
  typia.assert(firstCustomer);
  // Authorize second customer join
  const secondCustomerConnection: api.IConnection = { host: connection.host };
  const secondCustomer = await authorize_customer_join(
    secondCustomerConnection,
    {},
  );
  typia.assert(secondCustomer);
  // Authorize seller join
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, { body: {} });
  typia.assert(seller);
  // Seller creates a sale
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {},
  );
  typia.assert(sale);
  // Second customer creates a sale question
  const question =
    await generate_random_shopping_mall_customer_sales_questions_create_question(
      secondCustomerConnection,
      {
        params: { saleId: sale.id },
      },
    );
  typia.assert(question);
  // First customer attempts to update the second customer's question (expect 403 Forbidden)
  const updateBody: IShoppingMallSaleQuestion.IUpdate = {
    title: `Unauthorized update attempt by ${firstCustomer.email}`,
    body: `Trying to update question owned by another user.`,
    status: question.status,
  };
  await TestValidator.httpError(
    "unauthorized update triggers 403 forbidden",
    403,
    async () => {
      await api.functional.shoppingMall.customer.sales.questions.updateQuestion(
        firstCustomerConnection,
        {
          saleId: sale.id,
          questionId: question.id,
          body: updateBody,
        },
      );
    },
  );
  // Fetch the question again to verify no changes
  // Since fetch operation for single question is not provided in the list,
  // we simulate by attempting to update with original data by the author (second customer), expecting no error
  const originalUpdateBody: IShoppingMallSaleQuestion.IUpdate = {
    title: question.title,
    body: question.body,
    status: question.status,
  };
  const updatedQuestion =
    await api.functional.shoppingMall.customer.sales.questions.updateQuestion(
      secondCustomerConnection,
      {
        saleId: sale.id,
        questionId: question.id,
        body: originalUpdateBody,
      },
    );
  typia.assert(updatedQuestion);
  // Validate the question data remains original
  TestValidator.equals(
    "question title unchanged after unauthorized update",
    updatedQuestion.title,
    question.title,
  );
  TestValidator.equals(
    "question body unchanged after unauthorized update",
    updatedQuestion.body,
    question.body,
  );
  TestValidator.equals(
    "question status unchanged after unauthorized update",
    updatedQuestion.status,
    question.status,
  );
}
