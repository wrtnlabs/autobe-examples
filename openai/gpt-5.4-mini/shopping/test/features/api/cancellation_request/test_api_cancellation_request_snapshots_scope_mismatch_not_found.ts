import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequestSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Verifies that cancellation request snapshots are not accessible when the order item scope does not match.
 *
 * This test checks the seller-scoped cancellation request snapshot endpoint with intentionally mismatched order item and cancellation request identifiers. The endpoint must treat the lookup as not found rather than exposing preserved snapshot history from another order item.
 *
 * 1. Authenticate a seller account for scoped access.
 * 2. Use unrelated identifiers for the order item and cancellation request.
 * 3. Confirm the endpoint responds with not found for the mismatched relationship.
 */
export async function test_api_cancellation_request_snapshots_scope_mismatch_not_found(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "mismatched order item and cancellation request should not be found",
    404,
    async () => {
      await api.functional.mallPlatform.seller.orderItems.cancellationRequests.snapshots.index(
        sellerConnection,
        {
          orderItemId,
          cancellationRequestId,
        },
      );
    },
  );
}
