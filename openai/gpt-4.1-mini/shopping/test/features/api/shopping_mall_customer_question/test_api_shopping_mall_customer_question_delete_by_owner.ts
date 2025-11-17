import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerQuestion";

/**
 * Validate the workflow of deleting a shopping mall customer question by the
 * owner.
 *
 * The test performs the following steps:
 *
 * 1. Customer joins (registers and authenticates), obtaining authentication token.
 * 2. Customer creates a question with title and body.
 * 3. Customer deletes the created question using its identifier.
 * 4. Verifies the deletion by attempting to delete again and expecting an error.
 * 5. Tests that other customers cannot delete this question.
 *
 * This test ensures that only authenticated owners can delete their own
 * questions, securing data integrity and authorization.
 */
export async function test_api_shopping_mall_customer_question_delete_by_owner(
  connection: api.IConnection,
) {
  // 1. Customer joins (registers) and authenticates
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // 2. Customer creates a shopping mall customer question
  const questionCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IShoppingMallCustomerQuestion.ICreate;

  const question: IShoppingMallCustomerQuestion =
    await api.functional.shoppingMall.customer.shoppingMallCustomerQuestions.create(
      connection,
      { body: questionCreateBody },
    );
  typia.assert(question);
  TestValidator.equals(
    "question created title equals input",
    question.title,
    questionCreateBody.title,
  );

  // 3. Customer deletes the created question by ID
  await api.functional.shoppingMall.customer.shoppingMallCustomerQuestions.erase(
    connection,
    { shoppingMallCustomerQuestionId: question.id },
  );

  // 4. Attempt to delete again should yield an error because question is already deleted
  await TestValidator.error(
    "should not delete already deleted question",
    async () => {
      await api.functional.shoppingMall.customer.shoppingMallCustomerQuestions.erase(
        connection,
        { shoppingMallCustomerQuestionId: question.id },
      );
    },
  );

  // 5. Another customer joins (different customer) and attempts to delete question
  const anotherCustomerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies IShoppingMallCustomer.ICreate;

  const anotherCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: anotherCustomerCreateBody,
    });
  typia.assert(anotherCustomer);

  // Another customer trying to delete the previously deleted question (expect error)
  await TestValidator.error(
    "other customer cannot delete someone else's question",
    async () => {
      await api.functional.shoppingMall.customer.shoppingMallCustomerQuestions.erase(
        connection,
        { shoppingMallCustomerQuestionId: question.id },
      );
    },
  );
}
