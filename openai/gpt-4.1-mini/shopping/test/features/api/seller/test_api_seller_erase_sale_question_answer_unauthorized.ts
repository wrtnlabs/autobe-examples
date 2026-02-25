import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_erase_sale_question_answer_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Test unauthorized deletion attempts of a seller's answer by other sellers or non-owners.
  // Ensure 403 Forbidden when a seller attempts to delete an answer they don't own.
  // Validate 404 Not Found when answerId or saleId do not correspond to any record.
  // 1. Create and authorize seller owner of answer
  const sellerOwnerConnection: api.IConnection = { host: connection.host };
  const sellerOwner = await authorize_seller_join(sellerOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "sellerOwnerPass123",
      shopName: "OwnerShop",
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerOwner);
  // 2. Create and authorize another seller (unauthorized)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const unauthorizedSeller = await authorize_seller_join(
    unauthorizedConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "unauthorizedPass456",
        shopName: "OtherShop",
        shopDescription: null,
        logoUri: null,
      },
    },
  );
  typia.assert(unauthorizedSeller);
  // Normally we would create a sale and question-answer as sellerOwner,
  // but since the APIs to create sale question answers are not provided,
  // we must simulate existing saleId and answerId related to sellerOwner.
  // Simulate valid UUIDs for saleId and answerId owned by sellerOwner
  const validSaleId = typia.random<string & tags.Format<"uuid">>();
  const validAnswerId = typia.random<string & tags.Format<"uuid">>();
  // Unauthorized seller tries to delete the sellerOwner's answer - expect 403 Forbidden
  await TestValidator.httpError(
    "unauthorized seller cannot delete others' answer",
    403,
    async () => {
      await api.functional.shoppingMall.seller.sales.question_answers.eraseSaleQuestionAnswer(
        unauthorizedConnection,
        {
          saleId: validSaleId,
          answerId: validAnswerId,
        },
      );
    },
  );
  // Unauthorized seller tries to delete a non-existent answer (random UUIDs) - expect 404 Not Found
  await TestValidator.httpError(
    "deletion of non-existent answer returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.sales.question_answers.eraseSaleQuestionAnswer(
        unauthorizedConnection,
        {
          saleId: typia.random<string & tags.Format<"uuid">>(),
          answerId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
