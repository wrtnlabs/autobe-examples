import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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
 * Test that retrieving a non-existent cancellation request returns 404.
 *
 * Validates the error handling when a seller attempts to access a cancellation
 * request that either doesn't exist or doesn't belong to their shop. The endpoint
 * should return a proper 404 Not Found response with an appropriate error message.
 *
 * 1. Seller registers and authenticates on the platform.
 * 2. Generate a random UUID that does not correspond to any cancellation request.
 * 3. Attempt to retrieve cancellation request using the non-existent UUID.
 * 4. Verify HTTP 404 status code is returned.
 * 5. Verify error message indicates the resource was not found.
 */
export async function test_api_cancellation_request_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Generate a random UUID that doesn't exist in the system
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve non-existent cancellation request
  // 4 & 5. Verify 404 Not Found is returned
  await TestValidator.httpError(
    "non-existent cancellation request returns 404",
    404,
    async () =>
      await api.functional.ecommerceMall.seller.sellers.me.cancellation_requests.at(
        sellerConnection,
        {
          requestId: nonExistentId,
        },
      ),
  );
}
