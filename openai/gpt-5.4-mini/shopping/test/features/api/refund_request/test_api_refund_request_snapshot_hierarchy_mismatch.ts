import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
import type { IMallPlatformRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequestSnapshot";
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

export async function test_api_refund_request_snapshot_hierarchy_mismatch(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify refund request snapshot hierarchy enforcement for seller dispute history.
   *
   * This test validates that a refund request snapshot can only be retrieved when the full order item → refund request → snapshot chain matches exactly.
   * It authenticates a seller, captures a valid snapshot reference, and then intentionally mixes identifiers from different hierarchy levels to ensure the endpoint returns a not-found error instead of exposing unrelated historical data.
   *
   * 1. Authenticate a seller using a dedicated seller connection.
   * 2. Read a refund request snapshot through the legitimate hierarchy and keep the returned identifiers as a reference.
   * 3. Call the same endpoint with one valid identifier combined with mismatched parent identifiers and assert that the API responds with a not-found error.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(10)}@example.com` satisfies string,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const reference =
    await api.functional.mallPlatform.seller.orderItems.refundRequests.snapshots.at(
      sellerConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        refundRequestId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(reference);
  const mismatchedOrderItemId = typia.random<string & tags.Format<"uuid">>();
  const mismatchedRefundRequestId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "mismatched snapshot hierarchy should return not found",
    [404],
    async () => {
      await api.functional.mallPlatform.seller.orderItems.refundRequests.snapshots.at(
        sellerConnection,
        {
          orderItemId: mismatchedOrderItemId,
          refundRequestId: reference.refundRequest.id,
          snapshotId: reference.id,
        },
      );
    },
  );
  await TestValidator.httpError(
    "mismatched refund request hierarchy should return not found",
    [404],
    async () => {
      await api.functional.mallPlatform.seller.orderItems.refundRequests.snapshots.at(
        sellerConnection,
        {
          orderItemId: reference.refundRequest.orderItem.id,
          refundRequestId: mismatchedRefundRequestId,
          snapshotId: reference.id,
        },
      );
    },
  );
}
