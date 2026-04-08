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

/**
 * Verify cancellation request snapshot hierarchy mismatch handling.
 *
 * This test authenticates a seller account and then attempts to retrieve a cancellation request snapshot using
 * mismatched order item, cancellation request, and snapshot identifiers. It validates that the API enforces the
 * complete parent-child hierarchy and responds with not found when the snapshot does not belong to the supplied
 * cancellation request, or the cancellation request does not belong to the supplied order item.
 *
 * 1. Register and authenticate a seller account using the seller join utility.
 * 2. Call the snapshot retrieval endpoint with unrelated UUIDs for the hierarchy path.
 * 3. Assert that the endpoint rejects the request with a 404 not found error.
 */
export async function test_api_cancellation_request_snapshot_hierarchy_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: `${RandomGenerator.alphaNumeric(12)}!Aa1` satisfies string,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "hierarchy mismatch should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.seller.orderItems.cancellationRequests.snapshots.at(
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
