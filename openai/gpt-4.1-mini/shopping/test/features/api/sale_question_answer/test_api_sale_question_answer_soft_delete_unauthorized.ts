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

export async function test_api_sale_question_answer_soft_delete_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup seller actor
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerAuth);
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 2. Setup customer actor
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  typia.assert(customerAuth);
  customerConnection.headers = { Authorization: customerAuth.token.access };
  // 3. Customer creates a sale question
  const saleQuestionRaw =
    await generate_random_shopping_mall_customer_sale_questions_create_sale_question(
      customerConnection,
      { body: {} },
    );
  typia.assert(saleQuestionRaw);
  const saleQuestion = typia.assert<{ id: string }>(saleQuestionRaw);
  // 4. Seller creates a sale question answer
  const saleAnswerRaw =
    await generate_random_shopping_mall_seller_sale_question_answers_create(
      sellerConnection,
      {
        body: {
          shopping_mall_sale_question_id: saleQuestion.id,
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: "Answer Title",
          body: "Answer body content.",
        },
      },
    );
  typia.assert(saleAnswerRaw);
  const saleAnswer = typia.assert<{ id: string }>(saleAnswerRaw);
  // 5. Attempt to delete the sale question answer without authentication
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "should return 403 Forbidden when deleting sale question answer without auth",
    403,
    async () => {
      await api.functional.shoppingMall.seller.sale_question_answers.erase(
        unauthorizedConnection,
        { answerId: saleAnswer.id },
      );
    },
  );
}
