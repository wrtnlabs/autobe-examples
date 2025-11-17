import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallQuestionAnswer";

export async function test_api_shopping_mall_customer_question_answer_retrieval_by_customer(
  connection: api.IConnection,
) {
  // 1. Create a customer account and authenticate
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/current",
    referrer: "https://example.com/referrer",
  } satisfies IShoppingMallCustomer.ICreate;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(authorizedCustomer);

  // 2. Prepare realistic UUIDs for question and answer IDs
  const shoppingMallCustomerQuestionId = typia.random<
    string & tags.Format<"uuid">
  >();
  const shoppingMallQuestionAnswerId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Retrieve the specific seller answer by IDs
  const sellerAnswer: IShoppingMallQuestionAnswer =
    await api.functional.shoppingMall.customer.shoppingMallCustomerQuestions.shoppingMallQuestionAnswers.at(
      connection,
      {
        shoppingMallCustomerQuestionId,
        shoppingMallQuestionAnswerId,
      },
    );
  typia.assert(sellerAnswer);

  // 4. Validate expected content and metadata fields
  TestValidator.predicate(
    "seller answer title exists",
    typeof sellerAnswer.title === "string" && sellerAnswer.title.length > 0,
  );
  TestValidator.predicate(
    "seller answer body exists",
    typeof sellerAnswer.body === "string" && sellerAnswer.body.length > 0,
  );
  TestValidator.predicate(
    "seller answer id matches UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      sellerAnswer.id,
    ),
  );
  TestValidator.equals(
    "retrieved shoppingMallCustomerQuestionId matches",
    sellerAnswer.shopping_mall_customer_question_id,
    shoppingMallCustomerQuestionId,
  );
  TestValidator.equals(
    "retrieved shoppingMallQuestionAnswerId matches",
    sellerAnswer.id,
    shoppingMallQuestionAnswerId,
  );

  // 5. Validate audit timestamp fields presence
  TestValidator.predicate(
    "created_at is valid ISO date string",
    typeof sellerAnswer.created_at === "string" &&
      !isNaN(Date.parse(sellerAnswer.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date string",
    typeof sellerAnswer.updated_at === "string" &&
      !isNaN(Date.parse(sellerAnswer.updated_at)),
  );

  // 6. Check deleted_at is null or ISO date string (soft delete status)
  if (
    sellerAnswer.deleted_at !== null &&
    sellerAnswer.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "deleted_at is valid ISO date string or null",
      typeof sellerAnswer.deleted_at === "string" &&
        !isNaN(Date.parse(sellerAnswer.deleted_at)),
    );
  }
}
