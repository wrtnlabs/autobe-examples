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

export async function test_api_seller_sale_question_answer_creation_and_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Valid seller creates a new answer for an existing customer question on their sale listing.
  // 1) Seller join and authorize connection
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoinOutput = await authorize_seller_join(
    sellerJoinConnection,
    { body: {} },
  );
  typia.assert(sellerJoinOutput);
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: sellerJoinOutput.token.access },
  };
  // 2) Seller creates a sale
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {},
  );
  typia.assert(sale);
  // 3) Customer join and authorize connection
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerJoinOutput = await authorize_customer_join(
    customerJoinConnection,
    { body: {} },
  );
  typia.assert(customerJoinOutput);
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: customerJoinOutput.token.access },
  };
  // 4) Customer creates a question on the sale
  const question =
    await generate_random_shopping_mall_customer_sales_questions_create_question(
      customerConnection,
      {
        params: { saleId: sale.id },
      },
    );
  typia.assert(question);
  // 5) Seller creates an answer to the question
  const answer =
    await generate_random_shopping_mall_seller_sales_question_answers_create_answer(
      sellerConnection,
      {
        params: { saleId: sale.id },
        body: {
          shopping_mall_sale_question_id: question.id,
          title: `Answer to: ${question.title}`,
          body: `This is the answer content to question titled '${question.title}'.`,
        } satisfies IShoppingMallSaleQuestionAnswer.ICreate,
      },
    );
  typia.assert(answer);
  // 6) Validate answer properties
  TestValidator.equals(
    "answer question ID",
    answer.shoppingMallSaleQuestionId,
    question.id,
  );
  TestValidator.equals(
    "answer seller ID",
    answer.sellerId,
    sellerJoinOutput.id,
  );
  // Scenario 2: Unauthorized creation with invalid question ID or question not linked to sale
  // Create another seller who tries to create answer on first seller's sale
  const anotherSellerJoinConnection: api.IConnection = {
    host: connection.host,
  };
  const anotherSellerJoinOutput = await authorize_seller_join(
    anotherSellerJoinConnection,
    { body: {} },
  );
  typia.assert(anotherSellerJoinOutput);
  const anotherSellerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: anotherSellerJoinOutput.token.access },
  };
  // Attempt with non-existing question ID
  await TestValidator.error("throw on non-existing question ID", async () => {
    await generate_random_shopping_mall_seller_sales_question_answers_create_answer(
      sellerConnection,
      {
        params: { saleId: sale.id },
        body: {
          shopping_mall_sale_question_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          title: "Invalid Question",
          body: "This question ID does not exist.",
        } satisfies IShoppingMallSaleQuestionAnswer.ICreate,
      },
    );
  });
  // Attempt with question ID linked to another sale (created by another seller)
  const anotherSale = await generate_random_shopping_mall_seller_sales_create(
    anotherSellerConnection,
    {},
  );
  typia.assert(anotherSale);
  // Customer creates a question on another sale
  const anotherQuestion =
    await generate_random_shopping_mall_customer_sales_questions_create_question(
      customerConnection,
      {
        params: { saleId: anotherSale.id },
      },
    );
  typia.assert(anotherQuestion);
  // Another seller tries to create answer on the first seller's sale with question from another sale
  await TestValidator.error(
    "throw on question not linked to sale",
    async () => {
      await generate_random_shopping_mall_seller_sales_question_answers_create_answer(
        sellerConnection,
        {
          params: { saleId: sale.id },
          body: {
            shopping_mall_sale_question_id: anotherQuestion.id,
            title: "Mismatched Question",
            body: "Question does not belong to this sale.",
          } satisfies IShoppingMallSaleQuestionAnswer.ICreate,
        },
      );
    },
  );
  // Unauthorized seller tries to create answer on sale they do not own
  await TestValidator.error(
    "throw on unauthorized seller answer create",
    async () => {
      await generate_random_shopping_mall_seller_sales_question_answers_create_answer(
        anotherSellerConnection,
        {
          params: { saleId: sale.id },
          body: {
            shopping_mall_sale_question_id: question.id,
            title: "Unauthorized Answer",
            body: "Seller does not own this sale.",
          } satisfies IShoppingMallSaleQuestionAnswer.ICreate,
        },
      );
    },
  );
}
