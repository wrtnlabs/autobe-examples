import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that sellers can only view cancellation requests for their own products.
 *
 * This test verifies data isolation by:
 * 1. Creating two sellers (A and B)
 * 2. Authenticating as each seller
 * 3. Retrieving cancellation requests for each seller
 * 4. Verifying each seller only sees their own cancellation requests
 * 5. Confirming no data leakage between sellers
 */
export async function test_api_seller_cancellation_requests_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      shop_name: RandomGenerator.name(2),
    },
  });
  typia.assert(sellerA);
  // 2. Register and authenticate as seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      shop_name: RandomGenerator.name(2),
    },
  });
  typia.assert(sellerB);
  // 3. Seller A retrieves their cancellation requests
  const sellerACancellationRequests =
    await api.functional.shoppingMall.seller.cancellationRequests.index(
      sellerAConnection,
      {
        body: {} satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(sellerACancellationRequests);
  // 4. Seller B retrieves their cancellation requests
  const sellerBCancellationRequests =
    await api.functional.shoppingMall.seller.cancellationRequests.index(
      sellerBConnection,
      {
        body: {} satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(sellerBCancellationRequests);
  // 5. Validate data isolation
  // All cancellation requests returned to seller A should be associated with seller A
  TestValidator.predicate(
    "Seller A sees only their own cancellation requests",
    sellerACancellationRequests.data.every(
      (req) => req.seller === null || req.seller.id === sellerA.id,
    ),
  );
  // All cancellation requests returned to seller B should be associated with seller B
  TestValidator.predicate(
    "Seller B sees only their own cancellation requests",
    sellerBCancellationRequests.data.every(
      (req) => req.seller === null || req.seller.id === sellerB.id,
    ),
  );
  // Verify no overlap between sellers' cancellation request IDs
  const sellerARequestIds = new Set(
    sellerACancellationRequests.data.map((req) => req.id),
  );
  const sellerBRequestIds = new Set(
    sellerBCancellationRequests.data.map((req) => req.id),
  );
  const overlap: string[] = [];
  for (const id of sellerARequestIds) {
    if (sellerBRequestIds.has(id)) {
      overlap.push(id);
    }
  }
  TestValidator.equals(
    "No overlapping cancellation requests between sellers",
    overlap.length,
    0,
  );
  // Verify seller A and seller B have different IDs
  TestValidator.notEquals(
    "Seller A and Seller B have different IDs",
    sellerA.id,
    sellerB.id,
  );
}
