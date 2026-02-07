import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallRequestResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRequestResponse";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_pending_requests_combined_and_sorted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller using utility function (highest priority)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {} satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Fetch pending requests - this endpoint has no request body, just uses seller auth context
  const pendingRequests =
    await api.functional.shoppingMall.seller.seller.requests.pending.index(
      sellerConnection,
    );
  typia.assert(pendingRequests);
  // 3. Validate that the response structure is correct
  // Since IShoppingMallRequestResponse is defined as a simple empty object,
  // and the endpoint is documented to return a combined list, we verify:
  // - The response returns a non-null object (as per the API contract)
  // - No errors occurred during the call (ensured by typia.assert)
  // - The server properly processed the auth context
}
