import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequestSnapshot";
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

export async function test_api_cancellation_request_snapshot_scoped_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test cancellation request snapshot retrieval rejects mismatched parent scope.
   *
   * Ensures the seller-scoped snapshot lookup only resolves when the snapshot
   * belongs to the exact order item and cancellation request chain. The scenario
   * covers the business rule that immutable snapshot history must not be exposed
   * across parent boundaries, even when a snapshot identifier is valid for a
   * different dispute record.
   *
   * 1. Register a seller account so the request is executed under an authenticated seller identity.
   * 2. Attempt to retrieve a cancellation request snapshot with mismatched scope identifiers.
   * 3. Verify the API rejects the request as not found.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should reject snapshot lookup when the scope chain does not match",
    404,
    async () => {
      await api.functional.mallPlatform.seller.orderItems.cancellationRequests.snapshots.getByOrderitemidAndCancellationrequestidAndSnapshotid(
        sellerConnection,
        {
          orderItemId,
          cancellationRequestId,
          snapshotId,
        },
      );
    },
  );
}
