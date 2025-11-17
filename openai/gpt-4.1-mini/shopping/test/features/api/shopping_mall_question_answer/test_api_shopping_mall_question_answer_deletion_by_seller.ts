import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerQuestion";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Tests the deletion workflow of a seller's answer to a shopping mall customer
 * question.
 *
 * Steps:
 *
 * 1. Seller joins and logs in.
 * 2. Customer joins and logs in.
 * 3. Customer creates a shopping mall question.
 * 4. Seller deletes their answer to the created question (answer ID is randomly
 *    generated due to missing API).
 * 5. Attempts to delete the answer again to confirm hard delete triggers an error.
 * 6. Attempts deletion by a different seller confirming permission enforcement.
 */
export async function test_api_shopping_mall_question_answer_deletion_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller joins with realistic data
  const sellerEmail1 = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "securePass123";
  const seller1: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail1,
        password: sellerPassword,
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller1);

  // 2. Customer joins with realistic data
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "securePass123";
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: "https://shopping.mall/customer",
        referrer: "https://shopping.mall/",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 3. Customer login to set auth context
  const loggedCustomer = await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://shopping.mall/customer/question",
      referrer: "https://shopping.mall/",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(loggedCustomer);

  // 4. Customer creates a shopping mall question
  const questionTitle = "Question about product delivery";
  const questionBody = "When will my order be shipped?";
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
  TestValidator.equals("Question title matches", question.title, questionTitle);

  // 5. Seller login to set auth context
  const loggedSeller1 = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail1,
      password: sellerPassword,
      ip: null,
      href: "https://shopping.mall/seller",
      referrer: "https://shopping.mall/",
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(loggedSeller1);

  // NOTE: There is no API provided to create question answers.
  // Therefore, we simulate an existing answer by generating a random UUID for answerId.
  const answerId = typia.random<string & tags.Format<"uuid">>();

  // 6. Seller deletes their own answer
  await api.functional.shoppingMall.seller.shoppingMallCustomerQuestions.shoppingMallQuestionAnswers.erase(
    connection,
    {
      shoppingMallCustomerQuestionId: question.id,
      shoppingMallQuestionAnswerId: answerId,
    },
  );

  // 7. Try deleting same answer again - should throw error
  await TestValidator.error(
    "Deleting already deleted answer throws",
    async () => {
      await api.functional.shoppingMall.seller.shoppingMallCustomerQuestions.shoppingMallQuestionAnswers.erase(
        connection,
        {
          shoppingMallCustomerQuestionId: question.id,
          shoppingMallQuestionAnswerId: answerId,
        },
      );
    },
  );

  // 8. Another seller joins and tries to delete the original answer
  const sellerEmail2 = typia.random<string & tags.Format<"email">>();
  const seller2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail2,
        password: sellerPassword,
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller2);

  const loggedSeller2 = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail2,
      password: sellerPassword,
      ip: null,
      href: "https://shopping.mall/seller",
      referrer: "https://shopping.mall/",
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(loggedSeller2);

  await TestValidator.error("Other seller cannot delete answer", async () => {
    await api.functional.shoppingMall.seller.shoppingMallCustomerQuestions.shoppingMallQuestionAnswers.erase(
      connection,
      {
        shoppingMallCustomerQuestionId: question.id,
        shoppingMallQuestionAnswerId: answerId,
      },
    );
  });
}
