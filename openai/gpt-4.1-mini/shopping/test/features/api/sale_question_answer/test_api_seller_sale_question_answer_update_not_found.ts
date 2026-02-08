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

export async function test_api_seller_sale_question_answer_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(seller);
  // Prepare authenticated connection with token
  const authSellerConnection: api.IConnection = { host: connection.host };
  authSellerConnection.headers = {
    Authorization: `Bearer ${seller.token.access}`,
  };
  // Step 2: Attempt to update a non-existent sale question answer
  // Generate a random UUID for answerId
  const nonExistentAnswerId = typia.random<string & tags.Format<"uuid">>();
  // Prepare update body with random valid data
  const updateBody = typia.random<IShoppingMallSaleQuestionAnswer.IUpdate>();
  // Try updating and expect 404 HTTP error
  await TestValidator.httpError(
    "update non-existent sale question answer results in 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.sale_question_answers.updateAnswer(
        authSellerConnection,
        {
          answerId: nonExistentAnswerId,
          body: updateBody,
        },
      );
    },
  );
}
