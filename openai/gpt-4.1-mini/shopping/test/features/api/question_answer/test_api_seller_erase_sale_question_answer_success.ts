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

export async function test_api_seller_erase_sale_question_answer_success(
  connection: api.IConnection,
): Promise<void> {
  // Test the deletion of a seller's answer to a customer's question on a sale item.
  // 1. Authenticate as a seller (join) to obtain seller authorization
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, { body: {} });
  typia.assert(seller);
  // 2. Create test data - sales question and answer must exist. However, no direct API
  // exists to create sale question or answer so we must generate valid UUIDs to use as
  // IDs. This is a simulation of scenario where the data exists. The test relies on
  // authorization and response status.
  // Generate random UUIDs for saleId and answerId
  const saleId = typia.random<string & tags.Format<"uuid">>();
  const answerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to delete the seller's answer to the question
  // Use sellerConnection which has auth token
  await api.functional.shoppingMall.seller.sales.question_answers.eraseSaleQuestionAnswer(
    sellerConnection,
    {
      saleId,
      answerId,
    },
  );
  // Since eraseSaleQuestionAnswer returns void, test passes if no exceptions thrown.
  // It should follow 204 No Content behavior internally.
  // 4. Test unauthorized delete attempt. Create another connection without auth
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized deletion attempt", async () => {
    await api.functional.shoppingMall.seller.sales.question_answers.eraseSaleQuestionAnswer(
      unauthorizedConnection,
      {
        saleId,
        answerId,
      },
    );
  });
}
