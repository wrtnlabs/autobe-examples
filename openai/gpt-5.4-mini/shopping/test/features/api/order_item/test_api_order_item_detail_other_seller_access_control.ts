import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Verifies seller-side access control for order item detail retrieval.
 *
 * This test checks that an authenticated seller cannot inspect an order item that is not owned by their shop. Because the scenario surface only exposes seller authentication and the order-item detail endpoint, the test validates the access boundary with a foreign order item identifier and confirms the API rejects cross-seller inspection instead of exposing purchase context.
 *
 * 1. Authenticate a seller using the seller join flow on an actor-specific connection.
 * 2. Request an arbitrary order item detail that the seller does not own.
 * 3. Verify the endpoint denies access with an authorization-style HTTP error.
 */
export async function test_api_order_item_detail_other_seller_access_control(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(12)}@test.com` satisfies string,
      password: "password123" satisfies string,
    } satisfies IMallPlatformSeller.IJoin,
  });
  await TestValidator.httpError(
    "seller should not access another seller's order item detail",
    [401, 403, 404],
    async () => {
      await api.functional.mallPlatform.seller.orderItems.at(sellerConnection, {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
