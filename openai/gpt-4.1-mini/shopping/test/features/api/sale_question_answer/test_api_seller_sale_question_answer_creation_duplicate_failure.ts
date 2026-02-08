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

export async function test_api_seller_sale_question_answer_creation_duplicate_failure(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test the failure case when creating a duplicate answer for the same sale question
  // 1. Seller join and login
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoinData = typia.random<IShoppingMallSeller.IJoin>();
  const sellerJoin = await authorize_seller_join(sellerJoinConnection, {
    body: sellerJoinData,
  });
  typia.assert(sellerJoin);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  // Since IJoin does not have email/password, generate login data separately
  const sellerLoginData = typia.random<IShoppingMallSeller.ILogin>();
  const sellerLogin = await authorize_seller_login(sellerLoginConnection, {
    body: sellerLoginData,
  });
  typia.assert(sellerLogin);
  // 2. Customer join and login
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerJoinData = typia.random<IShoppingMallCustomer.IJoin>();
  const customerJoin = await authorize_customer_join(customerJoinConnection, {
    body: customerJoinData,
  });
  typia.assert(customerJoin);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLoginData = typia.random<IShoppingMallCustomer.ILogin>();
  const customerLogin = await authorize_customer_login(
    customerLoginConnection,
    {
      body: customerLoginData,
    },
  );
  typia.assert(customerLogin);
  // 3. Customer creates a sale question
  const saleQuestion =
    await generate_random_shopping_mall_customer_sale_questions_create_sale_question(
      customerLoginConnection,
      {},
    );
  typia.assert(saleQuestion);
  // 4. Seller creates an initial sale question answer with explicit seller_id, title, body
  // Use sellerLogin token user ID as seller_id if possible
  // We have no explicit seller id property so use a generated uuid
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const title = RandomGenerator.name();
  const body = RandomGenerator.paragraph({ sentences: 3 });
  const initialAnswer =
    await generate_random_shopping_mall_seller_sale_question_answers_create(
      sellerLoginConnection,
      {
        body: {
          shopping_mall_sale_question_id: saleQuestion! as unknown as string, // Use saleQuestion as id (assumed)
          seller_id: sellerId,
          title: title,
          body: body,
        },
      },
    );
  typia.assert(initialAnswer);
  // 5. Attempt to create a duplicate answer for the same sale question
  await TestValidator.httpError(
    "duplicate sale question answer creation",
    409,
    async () => {
      await generate_random_shopping_mall_seller_sale_question_answers_create(
        sellerLoginConnection,
        {
          body: {
            shopping_mall_sale_question_id: saleQuestion! as unknown as string,
            seller_id: sellerId,
            title: title,
            body: body,
          },
        },
      );
    },
  );
}
