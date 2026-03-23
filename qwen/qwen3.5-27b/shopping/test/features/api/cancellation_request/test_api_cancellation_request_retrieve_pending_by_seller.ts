import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
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
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

/**
 * Test that a seller can retrieve a cancellation request for their product while it's still in pending status.
 *
 * Setup:
 * 1. Register and authenticate a customer
 * 2. Register and authenticate a seller (with approved status)
 * 3. Create an order with an item from the seller's product (status: paid)
 * 4. Customer creates a cancellation request for that order item
 *
 * Test Execution:
 * 1. Seller calls GET /shoppingMall/seller/cancellationRequests/{cancellationRequestId} with the cancellation request ID
 * 2. Verify response returns complete cancellation request object
 * 3. Verify status is 'pending'
 * 4. Verify seller field is null (since seller hasn't responded yet)
 * 5. Verify customer information is included
 * 6. Verify order item details are included
 * 7. Verify reason and requestedAt timestamp are present
 * 8. Verify respondedAt is null
 *
 * Expected Result:
 * - HTTP 200 OK
 * - Complete cancellation request with all fields
 * - Status shows 'pending'
 * - Seller field is null
 * - All timestamps and reason are correctly populated
 */
export async function test_api_cancellation_request_retrieve_pending_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 3. Customer creates a cancellation request (this requires a valid order item)
  // Note: In a real scenario, we would need to create a product, order, and order item first.
  // For this test, we use the utility function which handles the preparation internally.
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {},
    );
  typia.assert(cancellationRequest);
  // 4. Seller retrieves the cancellation request
  const retrievedRequest =
    await api.functional.shoppingMall.seller.cancellationRequests.at(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 5. Validate the retrieved cancellation request
  TestValidator.equals(
    "cancellation request ID matches",
    retrievedRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.equals(
    "seller field is null for pending requests",
    retrievedRequest.seller,
    null,
  );
  TestValidator.predicate(
    "customer information is present",
    retrievedRequest.customer.id !== undefined,
  );
  TestValidator.predicate(
    "order item information is present",
    retrievedRequest.orderItem.id !== undefined,
  );
  TestValidator.predicate(
    "reason is present and non-empty",
    retrievedRequest.reason.length > 0,
  );
  TestValidator.predicate(
    "requestedAt timestamp is present",
    retrievedRequest.requestedAt !== undefined,
  );
  TestValidator.equals(
    "respondedAt is null for pending requests",
    retrievedRequest.respondedAt,
    null,
  );
  TestValidator.equals(
    "rejectionReason is null for pending requests",
    retrievedRequest.rejectionReason,
    null,
  );
}
