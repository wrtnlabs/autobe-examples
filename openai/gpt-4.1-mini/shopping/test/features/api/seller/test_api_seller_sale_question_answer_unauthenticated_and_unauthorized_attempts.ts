import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import type { IShoppingMallSaleQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestionAnswer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_sales_question_answers_create_answer } from "../../../generate/generate_random_shopping_mall_seller_sales_question_answers_create_answer";
import { prepare_random_shopping_mall_sale_question_answer } from "../../../prepare/prepare_random_shopping_mall_sale_question_answer";

export async function test_api_seller_sale_question_answer_unauthenticated_and_unauthorized_attempts(
  connection: api.IConnection,
): Promise<void> {
  /*
    Scenario 3: Attempt to create answer without authentication or unauthorized user.
    - Attempt to create a new answer without seller authentication.
    - Verify the system rejects the request due to missing auth.
    - Attempt to create answer as a seller who does not own the sale.
    - Verify the system returns access denied error.
    - Verify data integrity is maintained with no answer created.
    */
  // Join as seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shopName: "SellerAShop",
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerA);
  sellerAConnection.headers = {
    Authorization: `Bearer ${sellerA.token.access}`,
  };
  // Join as seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shopName: "SellerBShop",
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerB);
  sellerBConnection.headers = {
    Authorization: `Bearer ${sellerB.token.access}`,
  };
  // Seller A creates an answer to a random sale/question using the utility function to establish baseline ownership
  const answer =
    await generate_random_shopping_mall_seller_sales_question_answers_create_answer(
      sellerAConnection,
      {
        params: { saleId: typia.random<string & tags.Format<"uuid">>() },
      },
    );
  typia.assert(answer);
  // Attempt to create answer without authentication (no Authorization header)
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "answer creation unauthenticated should be rejected with 401",
    401,
    async () => {
      await api.functional.shoppingMall.seller.sales.question_answers.createAnswer(
        unauthenticatedConnection,
        {
          saleId: answer.saleQuestion.sale.id,
          body: {
            shopping_mall_sale_question_id: answer.saleQuestion.id,
            title: "Unauthorized Attempt",
            body: "Should not be allowed without auth",
          } satisfies IShoppingMallSaleQuestionAnswer.ICreate,
        },
      );
    },
  );
  // Attempt to create answer as seller B (unauthorized, does not own the sale)
  await TestValidator.httpError(
    "answer creation unauthorized seller should receive access denied error",
    403,
    async () => {
      await generate_random_shopping_mall_seller_sales_question_answers_create_answer(
        sellerBConnection,
        {
          params: { saleId: answer.saleQuestion.sale.id },
          body: {
            shopping_mall_sale_question_id: answer.saleQuestion.id,
            title: "Unauthorized Attempt by Seller B",
            body: "Should not be allowed non-owner seller",
          },
        },
      );
    },
  );
  // Verify no additional answers created for unauthorized attempts by querying is skipped because we have no read API, so trust the errors
}
