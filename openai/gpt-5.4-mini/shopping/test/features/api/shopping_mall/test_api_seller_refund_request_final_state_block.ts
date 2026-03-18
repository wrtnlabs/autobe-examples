import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_refund_request_final_state_block(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCredentials = {
    email: `${RandomGenerator.alphabets(8)}@test.com` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphabets(12),
  } satisfies IShoppingMallSeller.IJoin;
  const authorized = await authorize_seller_join(sellerConnection, {
    body: sellerCredentials,
  });
  typia.assert(authorized);
  const sellerConnection2: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorized.token.access },
  };
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const processBody = {
    decision: RandomGenerator.pick(["approve", "reject"] as const),
    reviewedReason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallRefundRequest.IProcess;
  await TestValidator.httpError(
    "terminal refund request cannot be processed again",
    [400, 403, 409, 422, 404],
    async () => {
      const response =
        await api.functional.shoppingMall.seller.orderItems.refundRequest.processRefundRequest(
          sellerConnection2,
          {
            orderItemId,
            body: processBody,
          },
        );
      typia.assert(response);
    },
  );
}
