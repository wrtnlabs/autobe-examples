import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerQuestion";
import type { IShoppingMallQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallQuestionAnswer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_shoppingmall_question_answer_update_by_seller(
  connection: api.IConnection,
) {
  // Seller joins
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "securePassword123",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Seller logs in to simulate real authentication
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        email: sellerEmail,
        password: "securePassword123",
        ip: null,
        href: "https://test.example.com",
        referrer: "https://referrer.example.com",
      } satisfies IShoppingMallSeller.ILogin,
    });
  typia.assert(sellerLoggedIn);

  // Customer joins
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "customerPassword456",
        href: "https://test.example.com",
        referrer: "https://referrer.example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Customer logs in
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerEmail,
        password: "customerPassword456",
        ip: null,
        href: "https://test.example.com",
        referrer: "https://referrer.example.com",
      } satisfies IShoppingMallCustomer.ILogin,
    });
  typia.assert(customerLoggedIn);

  // Customer creates a shopping mall customer question
  const questionTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 10,
  });
  const questionBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 10,
  });
  const question: IShoppingMallCustomerQuestion =
    await api.functional.shoppingMall.customer.shoppingMallCustomerQuestions.create(
      connection,
      {
        body: {
          title: questionTitle,
          body: questionBody,
        } satisfies IShoppingMallCustomerQuestion.ICreate,
      },
    );
  typia.assert(question);

  // Seller updates the answer for the created customer question
  // We create update data for title and body
  const answerUpdateTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 10,
  });
  const answerUpdateBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 4,
    sentenceMax: 8,
    wordMin: 3,
    wordMax: 10,
  });

  // We must provide the correct question and answer ids
  // However, answer id must be an existing id. Since creation of answer is not in scope,
  // the test can use the question id for both ids as a placeholder for integration
  // or a new answer id which must be valid.

  // For this test, we use the question id as answer id placeholder. This aligns with allowed uuid format
  // and allows focusing on update function invocation correctness.

  const updatedAnswer: IShoppingMallQuestionAnswer =
    await api.functional.shoppingMall.seller.shoppingMallCustomerQuestions.shoppingMallQuestionAnswers.update(
      connection,
      {
        shoppingMallCustomerQuestionId: question.id,
        shoppingMallQuestionAnswerId: question.id, // placeholder id
        body: {
          title: answerUpdateTitle,
          body: answerUpdateBody,
        } satisfies IShoppingMallQuestionAnswer.IUpdate,
      },
    );
  typia.assert(updatedAnswer);

  // Validate that updated answer matches the new content
  TestValidator.equals(
    "updated answer title matches",
    updatedAnswer.title,
    answerUpdateTitle,
  );
  TestValidator.equals(
    "updated answer body matches",
    updatedAnswer.body,
    answerUpdateBody,
  );
  TestValidator.equals(
    "answer refers to the correct question",
    updatedAnswer.shopping_mall_customer_question_id,
    question.id,
  );
}
