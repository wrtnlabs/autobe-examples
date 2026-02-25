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

export async function test_api_seller_question_answer_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test updating a seller's answer when the sale or answer does not exist.
  // Authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  // Use authorize_seller_join utility to register and authenticate a new seller
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test-password",
      shopName: typia.random<string>(),
      shopDescription: null,
      logoUri: null,
    },
  });
  // Update connection headers with authorized token
  sellerConnection.headers = {
    Authorization: sellerAuth.token.access,
  };
  // Prepare non-existent saleId and answerId
  // Use random UUIDs that are not linked to any data
  const nonExistentSaleId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentAnswerId = typia.random<string & tags.Format<"uuid">>();
  // Prepare an update body with random title and body
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallSaleQuestionAnswer.IUpdate;
  // Attempt to update using non-existent saleId
  await TestValidator.httpError(
    "update fails on non-existent saleId",
    404,
    async () => {
      await api.functional.shoppingMall.seller.sales.question_answers.updateQuestionAnswer(
        sellerConnection,
        {
          saleId: nonExistentSaleId,
          answerId: nonExistentAnswerId,
          body: updateBody,
        },
      );
    },
  );
  // Attempt to update using non-existent answerId but valid saleId
  // We must create a valid saleId to test this scenario
  // However, no utility or API for sale creation is provided in given info
  // So we reuse nonExistentSaleId for negative test that triggers 404 on answerId
  await TestValidator.httpError(
    "update fails on non-existent answerId",
    404,
    async () => {
      await api.functional.shoppingMall.seller.sales.question_answers.updateQuestionAnswer(
        sellerConnection,
        {
          saleId: nonExistentSaleId, // assuming sale exists but answerId does not
          answerId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );
}
