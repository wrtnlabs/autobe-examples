import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_refund_requests_create_refund_request } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create_refund_request";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

export async function test_api_seller_refund_request_approval_nonexistent_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(sellerJoin);
  // Update sellerConnection header for authorization
  sellerConnection.headers = { Authorization: sellerJoin.token.access };
  // 2. Customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customerJoin);
  // Update customerConnection header for authorization
  customerConnection.headers = { Authorization: customerJoin.token.access };
  // 3. Customer creates a refund request
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create_refund_request(
      customerConnection,
      {},
    );
  typia.assert(refundRequest);
  // 4. Seller attempts to approve refund request with non-existent refundRequestId
  const nonExistentRefundRequestId = typia.random<
    string & tags.Format<"uuid">
  >();
  const approveRejectBody: IShoppingMallRefundRequest.IApproveReject = {
    status: "approved",
    seller_response_reason: null, // optional, set to null explicitly
  };
  // Expect an error to be thrown due to non-existent refundRequestId
  await TestValidator.error("approve non-existent refund request", async () => {
    await api.functional.shoppingMall.seller.refund_requests.approve_reject.approveRejectRefundRequest(
      sellerConnection,
      {
        refundRequestId: nonExistentRefundRequestId,
        body: approveRejectBody,
      },
    );
  });
  // Since the refund request ID doesn't exist, no changes should occur in the refund request database
  // Note: Without direct DB access, we rely on no thrown errors and expected API behavior
  // Logging for audit purposes is assumed internal, so cannot be directly tested here
}
