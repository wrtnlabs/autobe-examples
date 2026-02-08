import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_shopping_mall_seller_sale_question_answers_create } from "../../../generate/generate_random_shopping_mall_seller_sale_question_answers_create";
import { prepare_random_shopping_mall_sale_question_answer } from "../../../prepare/prepare_random_shopping_mall_sale_question_answer";

export async function test_api_seller_sale_question_answer_creation_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Test authorization enforcement by attempting to create a sale question answer as an unauthenticated user
  // Create a base connection without authorization headers to simulate unauthorized access
  const guestConnection: api.IConnection = { host: connection.host };
  // Create a valid but random creation request body for sale question answer
  // We must construct a valid body matching IShoppingMallSaleQuestionAnswer.ICreate (empty object in structure, so unknown properties not allowed)
  // Since IShoppingMallSaleQuestionAnswer.ICreate has no explicit properties, we cannot create a meaningful body
  // Thus, we try to call with an empty object to pass structural API signature (may cause validation error on server, but it is to test authorization refusal first)
  await TestValidator.httpError(
    "unauthorized sale question answer creation attempt",
    401,
    async () => {
      await api.functional.shoppingMall.seller.sale_question_answers.create(
        guestConnection,
        {
          body: {},
        },
      );
    },
  );
}
