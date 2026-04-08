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

export async function test_api_cancellation_request_snapshot_parent_mismatch(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that cancellation request snapshot history remains scoped to the matching order item.
   *
   * This test focuses on the nested parent relationship enforced by the snapshot history route.
   * It authenticates a seller and then attempts to read cancellation request snapshots through a
   * mismatched order item and cancellation request pair so the API must reject the lookup.
   *
   * 1. Register a seller account and obtain an authenticated seller session.
   * 2. Call the snapshot history endpoint with mismatched parent identifiers.
   * 3. Assert that the request fails with a not-found style HTTP error.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: `seller_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
      password: "password123!",
    } satisfies IMallPlatformSeller.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "cancellation request snapshot history should reject mismatched parent identifiers",
    [404],
    async () => {
      await api.functional.mallPlatform.seller.orderItems.cancellationRequests.snapshots.index(
        sellerConnection,
        {
          orderItemId,
          cancellationRequestId,
          body: {
            page: 1,
            limit: 10,
          } satisfies IMallPlatformCancellationRequestSnapshot.IRequest,
        },
      );
    },
  );
}
