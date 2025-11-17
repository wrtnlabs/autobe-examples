import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerQuestion";

/**
 * Validate updating customer question by the question owner.
 *
 * This test performs the following steps:
 *
 * 1. Register a new customer using /auth/customer/join with required fields:
 *    email, password, href, referrer.
 * 2. Create a customer question using
 *    /shoppingMall/customer/shoppingMallCustomerQuestions with title and body,
 *    automatically linked to authenticated customer.
 * 3. Update the customer question using
 *    /shoppingMall/customer/shoppingMallCustomerQuestions/{shoppingMallCustomerQuestionId}
 *    by the owner customer, modifying title and body.
 * 4. Assert that the updated question data matches the new title and body.
 *
 * This ensures only the authenticated owner can update their question
 * successfully.
 */
export async function test_api_shopping_mall_customer_question_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Customer registration
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "validPassword123";

  const joinBody = {
    email: customerEmail,
    password: customerPassword,
    href: "https://test.client.app/current",
    referrer: "https://test.client.app/referrer",
  } satisfies IShoppingMallCustomer.ICreate;

  const authorizedCustomer = await api.functional.auth.customer.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert(authorizedCustomer);

  // 2. Create a customer question
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
  } satisfies IShoppingMallCustomerQuestion.ICreate;

  const createdQuestion =
    await api.functional.shoppingMall.customer.shoppingMallCustomerQuestions.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdQuestion);

  // 3. Update the customer question by owner
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies IShoppingMallCustomerQuestion.IUpdate;

  const updatedQuestion =
    await api.functional.shoppingMall.customer.shoppingMallCustomerQuestions.update(
      connection,
      {
        shoppingMallCustomerQuestionId: createdQuestion.id,
        body: updateBody,
      },
    );
  typia.assert(updatedQuestion);

  // 4. Validate the updated question
  TestValidator.equals(
    "updated question id matches",
    updatedQuestion.id,
    createdQuestion.id,
  );
  TestValidator.equals(
    "updated question title matches",
    updatedQuestion.title,
    updateBody.title,
  );
  TestValidator.equals(
    "updated question body matches",
    updatedQuestion.body,
    updateBody.body,
  );
}
