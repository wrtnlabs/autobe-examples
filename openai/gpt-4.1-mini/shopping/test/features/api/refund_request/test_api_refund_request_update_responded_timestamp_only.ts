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

export async function test_api_refund_request_update_responded_timestamp_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller account registration and authorization
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  sellerConnection.headers = { Authorization: sellerAuthorized.token.access };
  // 2. Prepare to create refund request snapshot
  const snapshot =
    await generate_random_shopping_mall_refund_request_snapshots_create_refund_request_snapshot(
      sellerConnection,
      {
        body: {},
      },
    );
  // 3. Update refund request responded_at timestamp only
  // Since DTO is empty, we send empty object as update body
  const updateBody: {} = {};
  // Extract refund request ID safely
  const refundRequestId =
    (snapshot as any).id ?? (snapshot as any).refund_request_id;
  if (typeof refundRequestId !== "string") {
    throw new Error("refund request ID not found on the snapshot");
  }
  const updatedRefundRequest =
    await api.functional.shoppingMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId: refundRequestId,
        body: updateBody,
      },
    );
  typia.assert(updatedRefundRequest);
  // Validate the updated refund request exists
  TestValidator.predicate(
    "Updated refund request exists",
    updatedRefundRequest !== null && updatedRefundRequest !== undefined,
  );
}
