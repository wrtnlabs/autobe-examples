import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_member_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_member_cancellation_requests_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";

export async function test_api_seller_cancel_request_already_processed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create seller account and authenticate
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  const sellerId: string & tags.Format<"uuid"> = sellerAuth.id;
  // 2. Setup: Create customer account and authenticate
  const customerJoinConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(customerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Setup: Create a seller connection for authenticated API calls
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerAuth.token.access,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Note: Due to API constraints, we cannot directly create orders, order items,
  // or cancellation requests. This test focuses on the cancellation request
  // update validation logic using a valid cancellation request ID.
  // 4. Test Case: Attempt to update an already-processed cancellation request
  const mockRequestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4a. First update attempt: Approve the cancellation request
  const updateApprovalConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(updateApprovalConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerAuth.token.access,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const approvalResult =
    await api.functional.ecommerceMall.seller.seller.cancel_requests.update(
      updateApprovalConnection,
      {
        requestId: mockRequestId,
        body: {
          status: "approved",
        } satisfies IEcommerceMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(approvalResult);
  const originalStatus: string = approvalResult.status;
  const approvedAt: string & tags.Format<"date-time"> =
    approvalResult.updated_at;
  TestValidator.equals("first update succeeds", originalStatus, "approved");
  // 4b. Second update attempt: Try to reject an already-approved request (should fail)
  const updateRejectConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(updateRejectConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerAuth.token.access,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // This should return 409 Conflict because the request is already approved
  await TestValidator.httpError(
    "second update returns 409 Conflict for already-processed request",
    [409],
    async () => {
      await api.functional.ecommerceMall.seller.seller.cancel_requests.update(
        updateRejectConnection,
        {
          requestId: mockRequestId,
          body: {
            status: "rejected",
          } satisfies IEcommerceMallCancellationRequest.IUpdate,
        },
      );
    },
  );
  // 4c. Verify status remains unchanged after failed update
  const verifyConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(verifyConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerAuth.token.access,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Re-fetch or verify the current state
  const verificationResult =
    await api.functional.ecommerceMall.seller.seller.cancel_requests.update(
      verifyConnection,
      {
        requestId: mockRequestId,
        body: {
          status: "approved",
        } satisfies IEcommerceMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(verificationResult);
  TestValidator.equals(
    "status remains approved",
    verificationResult.status,
    "approved",
  );
  TestValidator.equals(
    "approved_at timestamp unchanged",
    verificationResult.updated_at,
    approvedAt,
  );
}
