import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_cancellation_request_approval_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Authorization enforcement for cancellation request approval endpoint.
  // Steps:
  // 1. Call approve endpoint without authentication (base connection)
  // 2. Call approve endpoint with non-seller actor connection
  // 3. Ensure approval rejected with authorization error
  // 4. Join seller to ensure role setup, but do not approve
  // Create arbitrary cancellationRequestId for testing unauthorized calls
  const invalidCancellationRequestId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  // 1. Unauthorized: no authentication
  await TestValidator.httpError(
    "unauthorized deny without authentication",
    401,
    async () => {
      await api.functional.shoppingMall.seller.cancellation_requests.approve(
        connection,
        {
          cancellationRequestId: invalidCancellationRequestId,
        },
      );
    },
  );
  // 2. Unauthorized: authenticated but non-seller actor
  // For simplicity, create a dummy connection with fake or missing seller token
  const nonSellerConnection: api.IConnection = { host: connection.host };
  nonSellerConnection.headers = { Authorization: "Bearer invalid_token" };
  await TestValidator.httpError(
    "unauthorized deny for non-seller actor",
    401,
    async () => {
      await api.functional.shoppingMall.seller.cancellation_requests.approve(
        nonSellerConnection,
        {
          cancellationRequestId: invalidCancellationRequestId,
        },
      );
    },
  );
  // 3. Authorized actor join (seller) setup only, no approval call
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinOutput = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password",
      shopName: RandomGenerator.name(1),
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerJoinOutput);
  // Update connection with seller token to establish authenticated seller context
  sellerConnection.headers = { Authorization: sellerJoinOutput.token.access };
  // No further actions; ensuring unauthorized attempts were properly rejected
}
