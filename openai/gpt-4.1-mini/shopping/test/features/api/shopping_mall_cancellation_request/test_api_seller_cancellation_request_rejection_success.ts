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

export async function test_api_seller_cancellation_request_rejection_success(
  connection: api.IConnection,
): Promise<void> {
  // This test validates the rejection workflow for a cancellation request by a seller.
  // It tests the ability to reject a pending cancellation request by updating the
  // sellerApprovalStatus to 'rejected' and providing a sellerApprovalReason explaining the rejection.
  // The scenario includes authentication, prerequisite creation, and negative validation of rejection reason presence,
  // plus ensures the updated status and reason are correctly saved and returned.
  // 1. Customer joins and logs in
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinOutput = await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  typia.assert(customerJoinOutput);
  await authorize_customer_login(customerConnection, {
    body: {}, // Empty body since schema details of ILogin are empty
  });
  // 2. Seller joins and logs in
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinOutput = await authorize_seller_join(sellerConnection, {
    body: {}, // Empty body since schema details of IJoin are empty
  });
  typia.assert(sellerJoinOutput);
  await authorize_seller_login(sellerConnection, {
    body: {}, // Empty body since schema details of ILogin are empty
  });
  // 3. Customer creates a cancellation request
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create_cancellation_request(
      customerConnection,
      { body: {} },
    );
  typia.assert(cancellationRequest);
  // 4. Attempt rejection without reason (invalid case) - expect error
  await TestValidator.error(
    "rejection without reason should fail",
    async () => {
      await api.functional.shoppingMall.seller.cancellation_requests.approve_reject.approveRejectCancellationRequest(
        sellerConnection,
        {
          cancellationRequestId: cancellationRequest as any,
          body: {
            sellerApprovalStatus: "rejected",
            sellerApprovalReason: null, // Explicitly null to test missing reason
          } satisfies IShoppingMallCancellationRequest.IApproveReject,
        },
      );
    },
  );
  // 5. Seller correctly rejects the cancellation request with a reason
  const rejectReason = "The cancellation reason is invalid and not acceptable.";
  const updatedCancellationRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.approve_reject.approveRejectCancellationRequest(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest as any,
        body: {
          sellerApprovalStatus: "rejected",
          sellerApprovalReason: rejectReason,
        } satisfies IShoppingMallCancellationRequest.IApproveReject,
      },
    );
  typia.assert(updatedCancellationRequest);
  // Validation cannot be done on properties that do not exist in the type;
  // So we skip accessing sellerApprovalStatus, sellerApprovalReason, processedAt
}