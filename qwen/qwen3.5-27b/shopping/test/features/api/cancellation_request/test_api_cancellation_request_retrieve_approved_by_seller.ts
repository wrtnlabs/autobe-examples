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
 * Test that a seller can retrieve a cancellation request.
 *
 * This test verifies the cancellation request retrieval workflow:
 * 1. Customer registration and authentication
 * 2. Seller registration and authentication
 * 3. Customer creates a cancellation request for an order item
 * 4. Seller retrieves the cancellation request
 * 5. Validates the response structure and fields
 *
 * Note: This test does not include the approval step because the PUT endpoint
 * for approving cancellation requests is not available in the current SDK.
 * In a production scenario, the seller would first approve the request using
 * PUT /shoppingMall/seller/cancellationRequests/{id} before retrieving it.
 */
export async function test_api_cancellation_request_retrieve_approved_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
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
      password: "1234",
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 3. Customer creates a cancellation request
  // Note: This requires pre-existing order items with 'paid' status
  // The generate function handles the prerequisite setup internally
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
  // 5. Validate the retrieved cancellation request structure
  TestValidator.equals(
    "request ID matches",
    retrievedRequest.id,
    cancellationRequest.id,
  );
  TestValidator.predicate(
    "status is valid",
    retrievedRequest.status === "pending" ||
      retrievedRequest.status === "approved" ||
      retrievedRequest.status === "rejected",
  );
  TestValidator.equals(
    "order item ID matches",
    retrievedRequest.orderItem.id,
    cancellationRequest.orderItem.id,
  );
  TestValidator.equals(
    "customer ID matches",
    retrievedRequest.customer.id,
    cancellationRequest.customer.id,
  );
  TestValidator.equals(
    "reason matches",
    retrievedRequest.reason,
    cancellationRequest.reason,
  );
  TestValidator.equals(
    "requestedAt matches",
    retrievedRequest.requestedAt,
    cancellationRequest.requestedAt,
  );
  // Validate timestamps
  TestValidator.predicate(
    "createdAt is present",
    retrievedRequest.createdAt !== null,
  );
  TestValidator.predicate(
    "updatedAt is present",
    retrievedRequest.updatedAt !== null,
  );
  TestValidator.predicate(
    "deletedAt is null (active)",
    retrievedRequest.deletedAt === null,
  );
  // Validate seller and response fields based on status
  if (
    retrievedRequest.status === "approved" ||
    retrievedRequest.status === "rejected"
  ) {
    TestValidator.predicate(
      "seller field is populated when responded",
      retrievedRequest.seller !== null,
    );
    TestValidator.predicate(
      "respondedAt is populated when responded",
      retrievedRequest.respondedAt !== null,
    );
    if (retrievedRequest.status === "approved") {
      TestValidator.equals(
        "rejectionReason is null for approved",
        retrievedRequest.rejectionReason,
        null,
      );
    }
  } else {
    TestValidator.equals(
      "seller is null when pending",
      retrievedRequest.seller,
      null,
    );
    TestValidator.equals(
      "respondedAt is null when pending",
      retrievedRequest.respondedAt,
      null,
    );
  }
}
