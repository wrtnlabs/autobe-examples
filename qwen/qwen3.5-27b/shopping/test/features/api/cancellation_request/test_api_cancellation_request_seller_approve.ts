import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

/**
 * Test seller approval of a pending cancellation request submitted by a customer.
 *
 * Validates the complete cancellation approval workflow including seller authentication, cancellation request retrieval, and approval processing. Ensures that when a seller approves a cancellation request, the request status changes from 'pending' to 'approved', the associated order item status changes from 'paid' to 'cancelled', and a snapshot is created for audit trail purposes.
 *
 * Special attention is given to verifying that the approval process correctly updates the cancellation request status, changes the order item status, and creates an immutable snapshot capturing the status transition and seller's response reason.
 *
 * 1. Register and authenticate a seller account.
 * 2. Register and authenticate a customer account.
 * 3. Create an order with an item from the seller's product variant (simulated via cancellation request creation).
 * 4. Customer creates a cancellation request for the order item (status: pending).
 * 5. Seller approves the cancellation request with a response reason.
 * 6. Validates cancellation request status changed to 'approved'.
 * 7. Validates response_reason is stored correctly.
 * 8. Validates order item status changed to 'cancelled'.
 * 9. Validates snapshot was created with status transition information.
 */
export async function test_api_cancellation_request_seller_approve(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 3. Customer creates a cancellation request (simulates having an order item)
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // Verify initial status is 'pending'
  TestValidator.equals(
    "initial cancellation request status is pending",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.equals(
    "initial response_reason is null",
    cancellationRequest.response_reason,
    null,
  );
  // 4. Seller approves the cancellation request
  const responseReason =
    "We apologize for the inconvenience. Your cancellation has been approved.";
  const approvedRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "approved",
          response_reason: responseReason,
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 5. Validate cancellation request status changed to 'approved'
  TestValidator.equals(
    "cancellation request status changed to approved",
    approvedRequest.status,
    "approved",
  );
  // 6. Validate response_reason is stored correctly
  TestValidator.equals(
    "response_reason matches seller's explanation",
    approvedRequest.response_reason,
    responseReason,
  );
  // 7. Validate order item status changed to 'cancelled'
  TestValidator.equals(
    "order item status changed to cancelled",
    approvedRequest.orderItem.status,
    "cancelled",
  );
  // 8. Validate snapshot was created
  TestValidator.predicate(
    "at least one snapshot exists",
    approvedRequest.snapshots.length > 0,
  );
  // 9. Validate the latest snapshot contains correct transition information
  const latestSnapshot =
    approvedRequest.snapshots[approvedRequest.snapshots.length - 1];
  typia.assert(latestSnapshot);
  TestValidator.equals(
    "snapshot status_before is pending",
    latestSnapshot.status_before,
    "pending",
  );
  TestValidator.equals(
    "snapshot status_after is approved",
    latestSnapshot.status_after,
    "approved",
  );
  TestValidator.equals(
    "snapshot seller_response matches approval reason",
    latestSnapshot.seller_response,
    responseReason,
  );
  TestValidator.equals(
    "snapshot cancellation request ID matches",
    latestSnapshot.cancellationRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "snapshot seller ID matches approving seller",
    latestSnapshot.seller.id,
    sellerAuth.id,
  );
  // 10. Validate updated_at timestamp is set
  TestValidator.predicate("updated_at is a valid datetime", () => {
    const date = new Date(approvedRequest.updated_at);
    return !isNaN(date.getTime());
  });
}
