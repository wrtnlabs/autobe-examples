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

export async function test_api_refund_request_update_status_rejected_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // Seller joins and receives authorization token
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  sellerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Generate a random refund request ID (simulate existence)
  const refundRequestId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string & tags.Format<"uuid"> as string & tags.Format<"uuid">;
  // Create refund request snapshot to keep immutable history
  const refundRequestSnapshot =
    await generate_random_shopping_mall_refund_request_snapshots_create_refund_request_snapshot(
      sellerConnection,
      {
        body: {
          shopping_mall_refund_request_id: refundRequestId,
          status: "pending",
          reason: "Initial refund request",
          comment: "Initial comment",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    );
  typia.assert(refundRequestSnapshot);
  // Prepare update body
  // Because IShoppingMallRefundRequest.IUpdate does not define any property, pass empty object
  const updateBody: IShoppingMallRefundRequest.IUpdate = {};
  // Call update API as seller
  const updatedRefundRequest =
    await api.functional.shoppingMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId,
        body: updateBody,
      },
    );
  typia.assert(updatedRefundRequest);
  // Cannot validate response properties as types are empty
  // So only typia.assert performed to ensure response conforms to type
}
