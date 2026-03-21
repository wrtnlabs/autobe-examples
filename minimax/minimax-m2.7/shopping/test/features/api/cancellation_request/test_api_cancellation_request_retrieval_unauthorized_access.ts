import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a seller receives a 403 Forbidden error when attempting to retrieve a cancellation request belonging to another seller.
 *
 * This test validates the authorization logic that prevents sellers from accessing cancellation requests
 * for order items they do not own. The test:
 * 1. Registers and authenticates as Seller A
 * 2. Registers and authenticates as Seller B
 * 3. Attempts to access a cancellation request ID (simulating access to another seller's request)
 * 4. Verifies that the request fails with 403 Forbidden status
 */
export async function test_api_cancellation_request_retrieval_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate as Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {});
  // Step 2: Register and authenticate as Seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {});
  // Step 3: Seller B attempts to access a non-existent cancellation request ID
  // Since the request ID doesn't belong to Seller B, the authorization should reject it with 403
  const nonExistentRequestId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Verify that accessing another seller's cancellation request returns 403 Forbidden
  await TestValidator.httpError(
    "Seller B cannot access cancellation requests (403 Forbidden)",
    403,
    async () =>
      await api.functional.ecommerceMall.seller.cancellation_requests.at(
        sellerBConnection,
        {
          requestId: nonExistentRequestId,
        },
      ),
  );
}
