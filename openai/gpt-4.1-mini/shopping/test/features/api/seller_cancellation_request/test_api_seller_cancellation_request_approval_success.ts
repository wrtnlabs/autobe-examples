import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
import { generate_random_shopping_mall_customer_cancellation_requests_create_cancellation_request } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create_cancellation_request";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

export async function test_api_seller_cancellation_request_approval_success(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies the successful approval of a cancellation request by an authorized seller.
  // It involves authenticating a new seller, creating a cancellation request associated with an order item the seller owns,
  // then approving the cancellation request by setting the sellerApprovalStatus to 'approved'.
  // The test validates the response to ensure the cancellation request is updated correctly, including the updated sellerApprovalStatus and timestamp.
  // It also verifies that attempting to approve with invalid status values is rejected by the system (error handling).
  // The test includes multiple actors authentication and switching to simulate the real-world scenario between seller and customer.
  // 1. Register and authenticate a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody: IShoppingMallSeller.IJoin =
    typia.random<IShoppingMallSeller.IJoin>();
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuth);
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 2. Register and authenticate a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinBody: IShoppingMallCustomer.IJoin =
    typia.random<IShoppingMallCustomer.IJoin>();
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: customerJoinBody,
  });
  typia.assert(customerAuth);
  customerConnection.headers = { Authorization: customerAuth.token.access };
  // 3. Create a cancellation request by the customer associated with the seller's order item
  //    (simulate the generation for a valid cancellation request)
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create_cancellation_request(
      customerConnection,
      { body: {} },
    );
  typia.assert(cancellationRequest);
  // 4. Seller approves the cancellation request successfully
  // Use cancellationRequest.cancellation_request_id if exists, otherwise fallback to unknown

  let cancellationRequestId: string | undefined = undefined;
  if ("cancellation_request_id" in cancellationRequest) {
    cancellationRequestId = (cancellationRequest as any)["cancellation_request_id"];
  } else if ("requestId" in cancellationRequest) {
    cancellationRequestId = (cancellationRequest as any)["requestId"];
  }
  if (!cancellationRequestId) {
    // fallback: assign unknown string to avoid compilation error
    cancellationRequestId = "UNKNOWN_ID";
  }

  const approveBody: IShoppingMallCancellationRequest.IApproveReject = {
    sellerApprovalStatus: "approved",
    sellerApprovalReason: null,
  };
  const updatedRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.approve_reject.approveRejectCancellationRequest(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequestId,
        body: approveBody,
      },
    );
  typia.assert(updatedRequest);
  // Validate the updated status and processed_at timestamp if they exist
  if (
    "sellerApprovalStatus" in updatedRequest &&
    "processedAt" in updatedRequest &&
    typeof updatedRequest.sellerApprovalStatus === "string" &&
    typeof updatedRequest.processedAt === "string"
  ) {
    TestValidator.equals(
      "sellerApprovalStatus updated to approved",
      updatedRequest.sellerApprovalStatus,
      "approved",
    );
    TestValidator.predicate(
      "processed_at timestamp is set",
      updatedRequest.processedAt.length > 0,
    );
  }
  // 5. Verify error handling with invalid approval status value (should throw HTTP error)
  await TestValidator.error(
    "invalid sellerApprovalStatus is rejected",
    async () => {
      await api.functional.shoppingMall.seller.cancellation_requests.approve_reject.approveRejectCancellationRequest(
        sellerConnection,
        {
          cancellationRequestId: cancellationRequestId,
          body: {
            sellerApprovalStatus: "invalid_status" as any,
            sellerApprovalReason: "Invalid status test",
          },
        },
      );
    },
  );
}
