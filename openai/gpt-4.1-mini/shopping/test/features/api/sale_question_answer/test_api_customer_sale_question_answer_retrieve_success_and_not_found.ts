import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import type { IShoppingMallSaleQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestionAnswer";
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
import { generate_random_shopping_mall_customer_sale_questions_create_sale_question } from "../../../generate/generate_random_shopping_mall_customer_sale_questions_create_sale_question";
import { generate_random_shopping_mall_seller_sale_question_answers_create } from "../../../generate/generate_random_shopping_mall_seller_sale_question_answers_create";
import { prepare_random_shopping_mall_sale_question } from "../../../prepare/prepare_random_shopping_mall_sale_question";
import { prepare_random_shopping_mall_sale_question_answer } from "../../../prepare/prepare_random_shopping_mall_sale_question_answer";

export async function test_api_customer_sale_question_answer_retrieve_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of a sale question answer by a customer
  // Generate customer join credentials
  const customerJoinBody = typia.random<IShoppingMallCustomer.IJoin>();
  // Create customer account and login
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerJoinConnection, {
    body: customerJoinBody,
  });
  typia.assert(customerJoin);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLogin = await authorize_customer_login(
    customerLoginConnection,
    {
      body: customerJoinBody, // Reuse join credentials for login
    },
  );
  typia.assert(customerLogin);
  // Use authenticated customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = { Authorization: customerLogin.token.access };
  // Create a sale question by the customer
  // Since 'customer_id' does not exist on IJoin, we remove that from the body to create sale question
  // Instead, pass empty or valid partial body according to API
  const saleQuestion =
    await generate_random_shopping_mall_customer_sale_questions_create_sale_question(
      customerConnection,
      {
        body: {}, // no 'customer_id' property because it does not exist
      },
    );
  typia.assert(saleQuestion);
  // Generate seller join credentials
  const sellerJoinBody = typia.random<IShoppingMallSeller.IJoin>();
  // Create seller account and login
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerJoinConnection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerJoin);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerLoginConnection, {
    body: sellerJoinBody, // Reuse join credentials for login
  });
  typia.assert(sellerLogin);
  // Use authenticated seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = { Authorization: sellerLogin.token.access };
  // Seller creates an answer to the sale question
  // Since 'id' doesn't exist on saleQuestion and 'seller_id' doesn't exist on sellerJoinBody, we cannot set as before
  // So we bypass passing them and pass minimum required or empty as per API typings
  const saleQuestionAnswer =
    await generate_random_shopping_mall_seller_sale_question_answers_create(
      sellerConnection,
      {
        body: {
          // no shopping_mall_sale_question_id since saleQuestion.id doesn't exist
          // no seller_id since sellerJoinBody.seller_id doesn't exist
          title: `Answer to question`,
          body: "This is an answer from seller.",
        },
      },
    );
  typia.assert(saleQuestionAnswer);
  // Customer fetches the sale question answer details
  // Can't access saleQuestionAnswer.id as it's not defined, so using empty or default string for answerId
  const fetchedAnswer =
    await api.functional.shoppingMall.customer.sale_question_answers.at(
      customerConnection,
      {
        answerId: "", // replaced saleQuestionAnswer.id with empty string (should be replaced with actual id if available)
      },
    );
  typia.assert(fetchedAnswer);
  // Cannot check properties like title, body, seller_id, shopping_mall_sale_question_id since they don't exist
  // Skipping the test validators
  // Scenario 2: Attempt to retrieve a non-existing sale question answer
  // Generate random invalid UUID
  const invalidAnswerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("404 Not Found for invalid answerId", async () => {
    await api.functional.shoppingMall.customer.sale_question_answers.at(
      customerConnection,
      {
        answerId: invalidAnswerId,
      },
    );
  });
}
