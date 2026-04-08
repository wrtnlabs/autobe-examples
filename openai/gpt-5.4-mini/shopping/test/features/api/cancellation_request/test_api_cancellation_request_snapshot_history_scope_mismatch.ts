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
 * Verify cancellation-request snapshot history scope isolation for mismatched identifiers.
 *
 * This test confirms that the snapshot-history endpoint is strictly bound to the
 * supplied order item and cancellation request pair. It exercises a seller-authenticated
 * request where the cancellation request does not belong to the order item in the path,
 * and it validates that the API refuses to expose unrelated historical records.
 *
 * 1. Register a seller account and obtain an authenticated seller session.
 * 2. Call the snapshot-history endpoint with mismatched order item and cancellation
 *    request identifiers.
 * 3. Confirm the API responds with not found, proving the lookup is scoped to the
 *    exact parent-child relationship.
 */
export async function test_api_cancellation_request_snapshot_history_scope_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  const scopedSellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  await TestValidator.httpError(
    "cancellation request snapshot history should not leak across order items",
    404,
    async () => {
      await api.functional.mallPlatform.seller.orderItems.cancellationRequests.snapshots.getByOrderitemidAndCancellationrequestid(
        scopedSellerConnection,
        {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          cancellationRequestId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
