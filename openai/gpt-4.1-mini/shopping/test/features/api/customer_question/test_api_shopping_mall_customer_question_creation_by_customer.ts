import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerQuestion";

export async function test_api_shopping_mall_customer_question_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Create a new customer user account by calling the join endpoint.
  const email = `user_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const password = "strongPassword!123";
  const href = `https://example.com/signup?user=${email}`;
  const referrer = "https://example.com/";

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: email,
        password: password,
        href: href,
        referrer: referrer,
      } satisfies IShoppingMallCustomer.ICreate,
    });

  typia.assert(customerAuthorized); // ensures response is correctly typed including UUIDs

  // 2. Use the authenticated connection to create a new customer question.
  const questionTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 8,
  });
  const questionBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
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

  typia.assert(question); // ensures response matches IShoppingMallCustomerQuestion type

  // 3. Validate that returned question includes expected fields and association to customer
  TestValidator.equals("question title matches", question.title, questionTitle);
  TestValidator.equals("question body matches", question.body, questionBody);
  TestValidator.equals(
    "question linked to customer",
    question.shopping_mall_customer_id,
    customerAuthorized.id,
  );

  TestValidator.predicate(
    "question creation date is recent",
    new Date(question.created_at).getTime() > Date.now() - 60000,
  );

  TestValidator.predicate(
    "question updated date is recent",
    new Date(question.updated_at).getTime() >=
      new Date(question.created_at).getTime(),
  );

  TestValidator.predicate(
    "question is not marked deleted",
    question.deleted_at === null || question.deleted_at === undefined,
  );
}
