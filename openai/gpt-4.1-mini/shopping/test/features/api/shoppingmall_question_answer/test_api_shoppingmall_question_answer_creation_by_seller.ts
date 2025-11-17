import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallQuestionAnswer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_shoppingmall_question_answer_creation_by_seller(
  connection: api.IConnection,
) {
  // 1. Authenticate as seller via join operation
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "securePassword123!",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Prepare a shoppingMallCustomerQuestionId for the test
  // Since no such entity creation API is provided, we generate a UUID placeholder
  const shoppingMallCustomerQuestionId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Prepare the answer payload
  const answerBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IShoppingMallQuestionAnswer.ICreate;

  // 4. Create a new question answer for the provided question ID as the authenticated seller
  const answer: IShoppingMallQuestionAnswer =
    await api.functional.shoppingMall.seller.shoppingMallCustomerQuestions.shoppingMallQuestionAnswers.create(
      connection,
      {
        shoppingMallCustomerQuestionId,
        body: answerBody,
      },
    );
  typia.assert(answer);

  // 5. Verify the returned answer's properties
  TestValidator.equals(
    "answer title should match request",
    answer.title,
    answerBody.title,
  );
  TestValidator.equals(
    "answer body should match request",
    answer.body,
    answerBody.body,
  );
  TestValidator.predicate(
    "answer id should be a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      answer.id,
    ),
  );
  TestValidator.equals(
    "answer question ID should match",
    answer.shopping_mall_customer_question_id,
    shoppingMallCustomerQuestionId,
  );
  TestValidator.predicate(
    "answer seller ID should match authenticated seller",
    answer.shopping_mall_seller_id === seller.id,
  );
}
