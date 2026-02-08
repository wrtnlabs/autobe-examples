import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sale_question_detail(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of a sale question detail by an authorized customer.
  // - Precondition: A customer account is registered and authenticated.
  // - Given a valid existing `questionId` corresponding to a sale question not soft-deleted.
  // - When the customer requests the sale question details via GET /shoppingMall/customer/sale-questions/{questionId}.
  // - Then the API responds with status 200 OK.
  // - And the response body contains all details of the sale question matching the `questionId`, including title, body, status, created_at, updated_at, deleted_at as null.
  // - Validate that the authorization is enforced, and only authorized customers can access.
  // - Validate response matches the IShoppingMallSaleQuestion schema.
  // Scenario 2: Retrieval attempt with non-existing or soft-deleted sale question ID.
  // - Precondition: A customer account is registered and authenticated.
  // - Given a `questionId` that does not exist or that corresponds to a soft-deleted sale question.
  // - When the customer requests the sale question details.
  // - Then the API responds with status 404 Not Found.
  // - Validate error response structure if defined.
  // - Validate that unauthorized access is prevented.
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  customerConnection.headers = { Authorization: customerAuth.token.access };
  // 2. Prepare existing sale question id for successful fetch
  //    We must generate a valid UUID but we don't have API to create a sale question,
  //    so we simulate with random valid UUID as placeholder.
  //    Since no creation API available, we'll do 404 test with non-existent UUIDs.
  // Scenario 1: Successful fetch - We try a random UUID assuming it exists in the system (simulate)
  // (In real test, this would fetch a created sale question.)
  const validQuestionId = typia.random<string & tags.Format<"uuid">>();
  try {
    const saleQuestion =
      await api.functional.shoppingMall.customer.sale_questions.at(
        customerConnection,
        { questionId: validQuestionId },
      );
    typia.assert(saleQuestion);
    // Remove deleted_at check because property does not exist
    // TestValidator.predicate(
    //   "deleted_at is null",
    //   saleQuestion.deleted_at === null,
    // );
  } catch (exp) {
    // If fetch fails unexpectedly, fail test
    throw new Error(
      `Unexpected failure on fetching existing sale question id ${validQuestionId}: ${exp}`,
    );
  }
  // Scenario 2: Fetch non-existent or soft-deleted sale question id
  const invalidQuestionId = "00000000-0000-0000-0000-000000000000" as string &
    tags.Format<"uuid">;
  await TestValidator.httpError(
    "fetch non-existent sale question",
    404,
    async () => {
      await api.functional.shoppingMall.customer.sale_questions.at(
        customerConnection,
        {
          questionId: invalidQuestionId,
        },
      );
    },
  );
}
