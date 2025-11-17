import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallQuestionAnswer";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerQuestion";
import type { IShoppingMallQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallQuestionAnswer";

export async function test_api_shopping_mall_customer_question_answer_index_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Customer joins and authenticates
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "1234",
        href: "https://test.site/home",
        referrer: "https://referrer.site/",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Step 2: Create a new customer question
  const questionBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies IShoppingMallCustomerQuestion.ICreate;
  const question: IShoppingMallCustomerQuestion =
    await api.functional.shoppingMall.customer.shoppingMallCustomerQuestions.create(
      connection,
      {
        body: questionBody,
      },
    );
  typia.assert(question);

  // Step 3: Retrieve seller answers for the created question with pagination and filtering
  const page = 1 satisfies number;
  const limit = 20 satisfies number;
  const search = undefined as string | undefined;
  const orderBy = "created_at" as string | undefined;
  const orderDirection = "desc" as "asc" | "desc" | undefined;

  const requestBody = {
    page,
    limit,
    search,
    order_by: orderBy,
    order_direction: orderDirection,
  } satisfies IShoppingMallQuestionAnswer.IRequest;

  const answerPage: IPageIShoppingMallQuestionAnswer.ISummary =
    await api.functional.shoppingMall.customer.shoppingMallCustomerQuestions.shoppingMallQuestionAnswers.index(
      connection,
      {
        shoppingMallCustomerQuestionId: question.id,
        body: requestBody,
      },
    );
  typia.assert(answerPage);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination current page is valid",
    answerPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    answerPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    answerPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    answerPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "answer data is array",
    Array.isArray(answerPage.data),
  );
  for (const answer of answerPage.data) {
    typia.assert(answer);
    TestValidator.equals(
      "answer shoppingMallCustomerQuestionId matches",
      answer.shopping_mall_customer_question_id,
      question.id,
    );
  }
}
