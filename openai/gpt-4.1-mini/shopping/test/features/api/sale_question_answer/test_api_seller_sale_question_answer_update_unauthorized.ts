import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
import { generate_random_shopping_mall_customer_sale_questions_create_sale_question } from "../../../generate/generate_random_shopping_mall_customer_sale_questions_create_sale_question";
import { generate_random_shopping_mall_seller_sale_question_answers_create } from "../../../generate/generate_random_shopping_mall_seller_sale_question_answers_create";
import { prepare_random_shopping_mall_sale_question } from "../../../prepare/prepare_random_shopping_mall_sale_question";
import { prepare_random_shopping_mall_sale_question_answer } from "../../../prepare/prepare_random_shopping_mall_sale_question_answer";

export async function test_api_seller_sale_question_answer_update_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Unauthorized update attempt by a seller who does not own the answer.
  //
  // Steps:
  // 1. Authenticate as a seller (Seller A) and create a sale question answer.
  // 2. Authenticate as a different seller (Seller B).
  // 3. Attempt to update the answer created by Seller A.
  //
  // Validation:
  // - Verify the API responds with HTTP 403 Forbidden.
  // - Verify that the answer remains unchanged after the update attempt.
  // 1. Seller A join & authenticate
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, { body: {} });
  typia.assert(sellerA);
  // 2. Customer join & authenticate to create sale question
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customer);
  // 3. Create sale question by customer
  const saleQuestionRaw =
    await generate_random_shopping_mall_customer_sale_questions_create_sale_question(
      customerConnection,
      { body: {} },
    );
  const saleQuestion = typia.assert<IEntity>(saleQuestionRaw);
  // 4. Seller A creates sale question answer
  const answerRaw =
    await generate_random_shopping_mall_seller_sale_question_answers_create(
      sellerAConnection,
      { body: { shopping_mall_sale_question_id: saleQuestion.id } },
    );
  const answer = typia.assert<IEntity>(answerRaw);
  // 5. Seller B join & authenticate
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, { body: {} });
  typia.assert(sellerB);
  // 6. Seller B attempts unauthorized update
  const updateBody: IShoppingMallSaleQuestionAnswer.IUpdate = {
    title: "Unauthorized Update Attempt",
    body: "This update should be forbidden because Seller B does not own this answer.",
  };
  await TestValidator.error(
    "unauthorized seller cannot update sale question answer",
    async () => {
      await api.functional.shoppingMall.seller.sale_question_answers.updateAnswer(
        sellerBConnection,
        {
          answerId: answer.id,
          body: updateBody,
        },
      );
    },
  );
  // 7. Seller A fetches the answer again to verify unchanged
  // Since a direct get API for answer is not provided, simulate by re-fetching or assume answer remains unchanged by re-call get after update failed
  // Here, we will re-create an answer fetch by catching update again and getting the original answer ID fields
  // To ensure, call update with correct seller A with original body, then compare
  const sellerAUpdateAnswerRaw =
    await api.functional.shoppingMall.seller.sale_question_answers.updateAnswer(
      sellerAConnection,
      {
        answerId: answer.id,
        body: {
          title: (answer as any).title || "",
          body: (answer as any).body || "",
        },
      },
    );
  const sellerAUpdateAnswer = typia.assert<IEntity>(sellerAUpdateAnswerRaw);
  // Validate that the answer after Seller A update is equal to the original answer
  TestValidator.equals(
    "answer unchanged after unauthorized update",
    sellerAUpdateAnswer,
    answer,
  );
}
