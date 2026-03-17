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

export async function test_api_seller_dashboard_pending_seller_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Create a seller connection for the pending seller
  const sellerConnection: api.IConnection = { host: connection.host };
  // Register a new seller (approval_status will be 'pending' by default)
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      shopName: RandomGenerator.name(),
    },
  });
  typia.assert(seller);
  // Verify the seller has pending approval status
  TestValidator.equals(
    "approval status is pending",
    seller.approval_status,
    "pending",
  );
  // Attempt to access dashboard - should receive 403 Forbidden
  await TestValidator.httpError(
    "pending seller cannot access dashboard",
    403,
    async () => {
      await api.functional.shoppingMall.seller.dashboard.at(sellerConnection);
    },
  );
}
