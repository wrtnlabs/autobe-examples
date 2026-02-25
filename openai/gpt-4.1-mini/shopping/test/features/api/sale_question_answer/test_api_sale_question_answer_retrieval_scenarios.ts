import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import type { IShoppingMallSaleQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestionAnswer";
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
import { generate_random_shopping_mall_seller_sales_question_answers_create_answer } from "../../../generate/generate_random_shopping_mall_seller_sales_question_answers_create_answer";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";
import { prepare_random_shopping_mall_sale_question } from "../../../prepare/prepare_random_shopping_mall_sale_question";
import { prepare_random_shopping_mall_sale_question_answer } from "../../../prepare/prepare_random_shopping_mall_sale_question_answer";

export async function test_api_sale_question_answer_retrieval_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Retrieve a specific seller's answer to a customer question successfully
  {
    // Seller joins and logs in
    const sellerJoinConn: api.IConnection = { host: connection.host };
    const sellerJoinOutput = await authorize_seller_join(sellerJoinConn, { body: {} });
    typia.assert(sellerJoinOutput);
    // Seller connection for authenticated requests
    const sellerConnection: api.IConnection = { host: connection.host };
    sellerConnection.headers = { Authorization: sellerJoinOutput.token.access };
    // Seller creates a sale product
    const sale = await generate_random_shopping_mall_seller_sales_create(
      sellerConnection,
      {},
    );
    typia.assert(sale);
    // Customer joins and logs in
    const customerJoinConn: api.IConnection = { host: connection.host };
    const customerJoinOutput = await authorize_customer_join(
      customerJoinConn,
      { body: {} },
    );
    typia.assert(customerJoinOutput);
    // Customer connection for authenticated requests
    const customerConnection: api.IConnection = { host: connection.host };
    customerConnection.headers = {
      Authorization: customerJoinOutput.token.access,
    };
    // Customer posts a question on the sale
    const question =
      await generate_random_shopping_mall_customer_sales_questions_create_question(
        customerConnection,
        {
          params: { saleId: sale.id },
        },
      );
    typia.assert(question);
    // Seller posts an answer to this question
    const answer =
      await generate_random_shopping_mall_seller_sales_question_answers_create_answer(
        sellerConnection,
        {
          params: { saleId: sale.id },
          body: {
            shopping_mall_sale_question_id: question.id,
            title: `Answer title ${RandomGenerator.alphabets(10)}`,
            body: RandomGenerator.paragraph({ sentences: 4 }),
          },
        },
      );
    typia.assert(answer);
    // Retrieve the answer by seller
    const fetchedAnswer =
      await api.functional.shoppingMall.seller.sales.question_answers.at(
        sellerConnection,
        {
          saleId: sale.id,
          answerId: answer.id,
        },
      );
    typia.assert(fetchedAnswer);
    // Validate important properties
    TestValidator.equals("answer title", fetchedAnswer.title, answer.title);
    TestValidator.equals("answer body", fetchedAnswer.body, answer.body);
    TestValidator.equals("answer id", fetchedAnswer.id, answer.id);
    TestValidator.equals(
      "answer sellerId",
      fetchedAnswer.sellerId,
      sellerJoinOutput.id,
    );
    TestValidator.equals(
      "answer questionId",
      fetchedAnswer.shoppingMallSaleQuestionId,
      question.id,
    );
    // Validate linked seller summary matches
    TestValidator.equals(
      "linked seller id",
      fetchedAnswer.seller.id,
      sellerJoinOutput.id,
    );
    // Validate linked question summary matches
    TestValidator.equals(
      "linked question id",
      fetchedAnswer.saleQuestion.id,
      question.id,
    );
  }
  // Scenario 2: Authorization failure when an unauthorized seller tries to retrieve the answer
  {
    // SellerA joins and logs in
    const sellerAJoinConn: api.IConnection = { host: connection.host };
    const sellerAJoinOutput = await authorize_seller_join(sellerAJoinConn, { body: {} });
    typia.assert(sellerAJoinOutput);
    const sellerAConnection: api.IConnection = { host: connection.host };
    sellerAConnection.headers = {
      Authorization: sellerAJoinOutput.token.access,
    };
    // SellerA creates a sale product
    const saleA = await generate_random_shopping_mall_seller_sales_create(
      sellerAConnection,
      {},
    );
    typia.assert(saleA);
    // Customer joins and logs in
    const custJoinConn: api.IConnection = { host: connection.host };
    const custJoinOutput = await authorize_customer_join(custJoinConn, { body: {} });
    typia.assert(custJoinOutput);
    const custConnection: api.IConnection = { host: connection.host };
    custConnection.headers = { Authorization: custJoinOutput.token.access };
    // Customer posts a question on SellerA's sale
    const questionA =
      await generate_random_shopping_mall_customer_sales_questions_create_question(
        custConnection,
        {
          params: { saleId: saleA.id },
        },
      );
    typia.assert(questionA);
    // SellerA posts an answer
    const answerA =
      await generate_random_shopping_mall_seller_sales_question_answers_create_answer(
        sellerAConnection,
        {
          params: { saleId: saleA.id },
          body: {
            shopping_mall_sale_question_id: questionA.id,
            title: `Answer title ${RandomGenerator.alphabets(10)}`,
            body: RandomGenerator.paragraph({ sentences: 3 }),
          },
        },
      );
    typia.assert(answerA);
    // SellerB joins and logs in
    const sellerBJoinConn: api.IConnection = { host: connection.host };
    const sellerBJoinOutput = await authorize_seller_join(sellerBJoinConn, { body: {} });
    typia.assert(sellerBJoinOutput);
    const sellerBConnection: api.IConnection = { host: connection.host };
    sellerBConnection.headers = {
      Authorization: sellerBJoinOutput.token.access,
    };
    // SellerB attempts to retrieve SellerA's answer
    await TestValidator.httpError(
      "unauthorized seller access",
      [403],
      async () => {
        await api.functional.shoppingMall.seller.sales.question_answers.at(
          sellerBConnection,
          {
            saleId: saleA.id,
            answerId: answerA.id,
          },
        );
      },
    );
  }
  // Scenario 3: Attempt to retrieve a non-existent answer
  {
    // Seller joins and logs in
    const sellerJoinConn: api.IConnection = { host: connection.host };
    const sellerJoinOutput = await authorize_seller_join(sellerJoinConn, { body: {} });
    typia.assert(sellerJoinOutput);
    const sellerConnection: api.IConnection = { host: connection.host };
    sellerConnection.headers = { Authorization: sellerJoinOutput.token.access };
    // Seller creates a sale
    const sale = await generate_random_shopping_mall_seller_sales_create(
      sellerConnection,
      {},
    );
    typia.assert(sale);
    // Use random UUID as non-existent answerId
    const nonExistentAnswerId = typia.random<string & tags.Format<"uuid">>();
    // Attempt to get non-existent answer
    await TestValidator.httpError(
      "fetch non-existent answer",
      [404],
      async () => {
        await api.functional.shoppingMall.seller.sales.question_answers.at(
          sellerConnection,
          {
            saleId: sale.id,
            answerId: nonExistentAnswerId,
          },
        );
      },
    );
  }
}
