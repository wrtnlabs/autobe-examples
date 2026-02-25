import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
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
import { generate_random_shopping_mall_customer_sales_questions_create_question } from "../../../generate/generate_random_shopping_mall_customer_sales_questions_create_question";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";
import { prepare_random_shopping_mall_sale_question } from "../../../prepare/prepare_random_shopping_mall_sale_question";

export async function test_api_customer_sales_question_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Update attempt on a non-existent question.
  // - Authenticate as a customer (join).
  // - Create a sale listing as a seller.
  // - Attempt to update a question with invalid/non-existent questionId and saleId.
  // - Verify the API returns a 404 Not Found error indicating the question or sale does not exist.
  //
  // This checks the system's error handling for missing resources during update.
  // 1. Seller join and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  sellerConnection.headers = { Authorization: sellerAuthorized.token.access };
  // 2. Customer join and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {},
  });
  customerConnection.headers = {
    Authorization: customerAuthorized.token.access,
  };
  // 3. Seller creates a sale
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(sale);
  // 4. Attempt to update a non-existent question
  const fakeSaleId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string & tags.Format<"uuid">;
  const fakeQuestionId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string & tags.Format<"uuid">;
  const updateBody = {
    title: "Non-existent question title",
    body: "Trying to update question that does not exist",
    status: "open",
  } satisfies IShoppingMallSaleQuestion.IUpdate;
  // Since this is expected to fail, test for HTTP error 404
  await TestValidator.httpError(
    "update non-existent question should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.customer.sales.questions.updateQuestion(
        customerConnection,
        {
          saleId: fakeSaleId,
          questionId: fakeQuestionId,
          body: updateBody,
        },
      );
    },
  );
}
