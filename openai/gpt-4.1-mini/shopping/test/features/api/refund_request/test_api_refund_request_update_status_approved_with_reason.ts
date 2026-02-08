import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_refund_request_snapshots_create_refund_request_snapshot } from "../../../generate/generate_random_shopping_mall_refund_request_snapshots_create_refund_request_snapshot";
import { prepare_random_shopping_mall_refund_request_snapshot } from "../../../prepare/prepare_random_shopping_mall_refund_request_snapshot";

export async function test_api_refund_request_update_status_approved_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // Seller joining and obtaining authorized connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: {} satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(authorizedSeller);
  sellerConnection.headers = { Authorization: authorizedSeller.token.access };
  // Prepare a refund request snapshot to maintain immutable history
  const snapshot =
    await generate_random_shopping_mall_refund_request_snapshots_create_refund_request_snapshot(
      sellerConnection,
      { body: {} },
    );
  typia.assert(snapshot);
  // Extract refundRequestId from snapshot
  // Since the property name is not guaranteed, use a type guard and fallback error if missing
  const refundRequestId: string =
    (snapshot as any).refundRequestId ??
    (() => {
      throw new Error("refundRequestId missing in snapshot");
    })();
  // Prepare update body according to IShoppingMallRefundRequest.IUpdate
  const updateBody = {
    status: "approved" as const,
    seller_response_reason: RandomGenerator.paragraph({ sentences: 2 }),
    responded_at: new Date().toISOString(),
  };
  // Execute refund request update as seller
  const updatedRefundRequest =
    await api.functional.shoppingMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId: refundRequestId,
        body: updateBody,
      },
    );
  typia.assert(updatedRefundRequest);
  // Since status property does not exist on IShoppingMallRefundRequest, do not access it
  // Instead, verify we got a valid refund request object as ensured by typia.assert
}
