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

export async function test_api_seller_resubmit_pending_status_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new seller account (approval_status='pending')
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: {
      shopName: RandomGenerator.name(1),
    },
  });
  typia.assert(authorizedSeller);
  // 2. Verify seller has pending approval status
  TestValidator.equals(
    "approval status is pending",
    authorizedSeller.approval_status,
    "pending",
  );
  // 3. Attempt to resubmit (should fail for pending sellers)
  await TestValidator.error("pending seller cannot resubmit", async () => {
    await api.functional.shoppingMall.seller.resubmit(sellerConnection, {
      body: {
        shop_name: RandomGenerator.name(1),
        shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IShoppingMallSeller.IResubmit,
    });
  });
}
