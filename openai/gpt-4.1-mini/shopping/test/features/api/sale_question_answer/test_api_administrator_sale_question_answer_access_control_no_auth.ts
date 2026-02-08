import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import type { IShoppingMallSaleQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestionAnswer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
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

export async function test_api_administrator_sale_question_answer_access_control_no_auth(
  connection: api.IConnection,
): Promise<void> {
  // This test checks that an unauthenticated request to get a sale question answer by ID from the administrator endpoint is forbidden (403).
  // 1. Setup actors: administrator join & login, customer join & login, seller join & login
  const administratorConnection: api.IConnection = { host: connection.host };
  const administratorAuth = await authorize_administrator_join(
    administratorConnection,
    {
      body: typia.random<IShoppingMallAdministrator.IJoin>(),
    },
  );
  administratorConnection.headers = {
    Authorization: administratorAuth.token.access,
  };
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  customerConnection.headers = { Authorization: customerAuth.token.access };
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 2. Create prerequisite sale question by customer
  const saleQuestion =
    await generate_random_shopping_mall_customer_sale_questions_create_sale_question(
      customerConnection,
      { body: {} },
    );
  typia.assert(saleQuestion);
  // 3. Create prerequisite sale question answer by seller
  const saleQuestionAnswer =
    await generate_random_shopping_mall_seller_sale_question_answers_create(
      sellerConnection,
      {
        body: {
          shopping_mall_sale_question_id: (saleQuestion as any).uuid ?? '',
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: "Answer Title",
          body: "Answer body for the question.",
        },
      },
    );
  typia.assert(saleQuestionAnswer);
  // 4. Attempt to access sale question answer with PERMISSION DENIED (403) without administrator authentication
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "Unauthorized access forbidden",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.sale_question_answers.at(
        unauthenticatedConnection,
        { answerId: (saleQuestionAnswer as any).uuid ?? '' },
      );
    },
  );
}
