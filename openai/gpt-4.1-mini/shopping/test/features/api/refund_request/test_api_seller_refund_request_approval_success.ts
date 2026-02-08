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

/**
 * Test approving a refund request successfully.
 *
 * Prerequisites:
 * - Seller joins the platform.
 * - Customer creates a refund request for an order item.
 *
 * Test steps:
 * 1. Authenticate as the seller.
 * 2. Call the approve-reject refund request endpoint with a valid refundRequestId.
 * 3. Provide request body with status set to 'approved' and no seller response reason.
 * 4. Verify the refund request status updates to 'approved'.
 * 5. Verify responded_at timestamp is updated.
 * 6. Validate response returns updated refund request details.
 * 7. Check that unauthorized users cannot perform approval.
 */
export async function test_api_seller_refund_request_approval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerJoinConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerJoin);
  // 2. Seller login
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerLoginConnection, {
    body: typia.random<IShoppingMallSeller.ILogin>(),
  });
  typia.assert(sellerLogin);
  // Use sellerLoginConnection for authenticated seller API calls
  // 3. Customer joins
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerJoinConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  typia.assert(customerJoin);
  // 4. Customer login
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLogin = await authorize_customer_login(
    customerLoginConnection,
    {
      body: typia.random<IShoppingMallCustomer.ILogin>(),
    },
  );
  typia.assert(customerLogin);
  // 5. Customer creates refund request
  const refundRequestRaw =
    await generate_random_shopping_mall_customer_refund_requests_create_refund_request(
      customerLoginConnection,
      { body: {} },
    );
  // Cast refundRequestRaw to any to access id
  const refundRequest = refundRequestRaw satisfies any as any;
  typia.assert(refundRequest);
  // 6. Seller approves refund request
  const approveBody: IShoppingMallRefundRequest.IApproveReject = {
    status: "approved",
    seller_response_reason: null,
  };
  const resultRaw =
    await api.functional.shoppingMall.seller.refund_requests.approve_reject.approveRejectRefundRequest(
      sellerLoginConnection,
      {
        refundRequestId: refundRequest.id,
        body: approveBody,
      },
    );
  // Cast resultRaw to any to access status and responded_at
  const result = resultRaw satisfies any as any;
  typia.assert(result);
  // 7. Validate the refund request status is approved and responded_at is set
  TestValidator.equals(
    "refund request status should be approved",
    result.status,
    "approved",
  );
  TestValidator.predicate(
    "refund request responded_at should be not null",
    result.responded_at !== null && result.responded_at !== undefined,
  );
  // 8. Verify unauthorized user cannot perform approval
  await TestValidator.error("unauthorized user cannot approve", async () => {
    await api.functional.shoppingMall.seller.refund_requests.approve_reject.approveRejectRefundRequest(
      customerLoginConnection,
      {
        refundRequestId: refundRequest.id,
        body: approveBody,
      },
    );
  });
}
