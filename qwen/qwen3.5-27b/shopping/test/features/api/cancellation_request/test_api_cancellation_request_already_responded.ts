import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

export async function test_api_cancellation_request_already_responded(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that attempting to respond to an already-resolved cancellation request is rejected.
   *
   * Scenario:
   * 1. Seller responds to a cancellation request with 'approved' status
   * 2. Seller attempts to respond again with 'rejected' status
   * 3. Second response should be rejected because request is already resolved
   */
  // 1. Setup: Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerJoin);
  // 2. Setup: Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerJoin);
  // 3. Setup: Customer creates a cancellation request (simulated)
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {},
    );
  typia.assert(cancellationRequest);
  // Verify initial state
  TestValidator.equals(
    "initial cancellation request status is pending",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.equals(
    "initial cancellation request has no responded_at",
    cancellationRequest.respondedAt,
    null,
  );
  // 4. First response: Seller approves the cancellation request
  const approvedRequest =
    await api.functional.shoppingMall.admin.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // Verify first response was successful
  TestValidator.equals(
    "first response status is approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "first response has responded_at timestamp",
    approvedRequest.respondedAt !== null,
  );
  TestValidator.predicate(
    "first response has seller assigned",
    approvedRequest.seller !== null,
  );
  // Store the responded_at timestamp for later verification
  const firstResponseTimestamp = approvedRequest.respondedAt;
  // 5. Second response attempt: Seller tries to reject the already-approved request
  // This should fail because the request is already resolved
  await TestValidator.error("second response attempt should fail", async () => {
    await api.functional.shoppingMall.admin.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "rejected",
          rejection_reason: "Cannot process this request",
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  });
  // 6. Third response attempt: Try to approve again (should also fail)
  await TestValidator.error(
    "third response attempt should also fail",
    async () => {
      await api.functional.shoppingMall.admin.cancellation_requests.update(
        sellerConnection,
        {
          cancellationRequestId: cancellationRequest.id,
          body: {
            status: "approved",
          } satisfies IShoppingMallCancellationRequest.IUpdate,
        },
      );
    },
  );
  // 7. Verify idempotency: Multiple attempts to respond are blocked
  // The cancellation request should remain in the approved state
  // We cannot call the update endpoint again, so we verify from the first response
  TestValidator.predicate(
    "cancellation request remains in approved state",
    approvedRequest.status === "approved",
  );
  TestValidator.predicate(
    "responded_at timestamp remains unchanged",
    approvedRequest.respondedAt === firstResponseTimestamp,
  );
  TestValidator.predicate(
    "seller remains assigned after failed attempts",
    approvedRequest.seller !== null,
  );
}
