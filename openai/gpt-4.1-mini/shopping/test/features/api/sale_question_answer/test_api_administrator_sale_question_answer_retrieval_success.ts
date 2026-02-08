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

export async function test_api_administrator_sale_question_answer_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Administrator join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: typia.random<IShoppingMallAdministrator.IJoin>(),
  });
  typia.assert(adminJoin);
  const adminLogin = await authorize_administrator_login(adminConnection, {
    body: typia.random<IShoppingMallAdministrator.ILogin>(),
  });
  typia.assert(adminLogin);
  // Step 2: Customer join and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  typia.assert(customerJoin);
  const customerLogin = await authorize_customer_login(customerConnection, {
    body: typia.random<IShoppingMallCustomer.ILogin>(),
  });
  typia.assert(customerLogin);
  // Step 3: Seller join and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerJoin);
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: typia.random<IShoppingMallSeller.ILogin>(),
  });
  typia.assert(sellerLogin);
  // Step 4: Customer creates a sale question
  const saleQuestion =
    await generate_random_shopping_mall_customer_sale_questions_create_sale_question(
      customerConnection,
      { body: {} },
    );
  typia.assert(saleQuestion);
  // Step 5: Seller creates a sale question answer linked to the customer's question
  const saleQuestionAnswer =
    await generate_random_shopping_mall_seller_sale_question_answers_create(
      sellerConnection,
      {
        body: {
          shopping_mall_sale_question_id: (saleQuestion as any).id ?? "",
          seller_id: (sellerLogin.token.access ?? "") satisfies string as string,
          title: "Answer to your question",
          body: "This is a reply to your sale question.",
        },
      },
    );
  typia.assert(saleQuestionAnswer);
  // Step 6: Administrator retrieves the sale question answer by valid answerId
  const retrieved =
    await api.functional.shoppingMall.administrator.sale_question_answers.at(
      adminConnection,
      { answerId: (saleQuestionAnswer as any).id ?? "" },
    );
  typia.assert(retrieved);
  // Validate exact match for important fields
  TestValidator.equals(
    "answer id matches",
    (retrieved as any).id,
    (saleQuestionAnswer as any).id,
  );
  TestValidator.equals(
    "answer question id matches",
    (retrieved as any).shopping_mall_sale_question_id,
    (saleQuestionAnswer as any).shopping_mall_sale_question_id,
  );
  TestValidator.equals(
    "answer seller id matches",
    (retrieved as any).seller_id,
    (saleQuestionAnswer as any).seller_id,
  );
  TestValidator.equals(
    "answer title matches",
    (retrieved as any).title,
    (saleQuestionAnswer as any).title,
  );
  TestValidator.equals(
    "answer body matches",
    (retrieved as any).body,
    (saleQuestionAnswer as any).body,
  );
  // Validate timestamps presence (created_at, updated_at) not null
  TestValidator.predicate(
    "created_at present",
    (retrieved as any).created_at !== null &&
      (retrieved as any).created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at present",
    (retrieved as any).updated_at !== null &&
      (retrieved as any).updated_at !== undefined,
  );
  // Step 7: Confirm that access without administrator authorization fails with 403
  await TestValidator.httpError(
    "Access without admin authorization fails 403",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.sale_question_answers.at(
        connection,
        { answerId: (saleQuestionAnswer as any).id ?? "" },
      );
    },
  );
  // Step 8: Confirm that using a non-existent answerId returns 404
  await TestValidator.httpError(
    "Retrieval of non-existent answer returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.sale_question_answers.at(
        adminConnection,
        { answerId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );
}
