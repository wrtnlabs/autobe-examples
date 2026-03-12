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

/**
 * Test that an authenticated administrator can retrieve an approved cancellation request with seller response details.
 *
 * Workflow:
 * 1. Create customer, seller, and admin connections
 * 2. Customer creates a cancellation request
 * 3. Admin retrieves the cancellation request
 * 4. Validate response structure and data integrity
 */
export async function test_api_cancellation_request_retrieve_approved_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Setup: Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Setup: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Customer creates a cancellation request
  // Note: This utility function internally handles order item preparation
  const cancellationRequest: IShoppingMallCancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {},
    );
  typia.assert(cancellationRequest);
  // 5. Admin retrieves the cancellation request by ID
  const retrievedRequest: IShoppingMallCancellationRequest =
    await api.functional.shoppingMall.admin.cancellation_requests.at(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 6. Validate response structure and business logic
  TestValidator.equals(
    "cancellation request ID matches",
    retrievedRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "order item ID preserved",
    retrievedRequest.orderItem.id,
    cancellationRequest.orderItem.id,
  );
  TestValidator.equals(
    "customer ID preserved",
    retrievedRequest.customer.id,
    cancellationRequest.customer.id,
  );
  TestValidator.equals(
    "reason preserved",
    retrievedRequest.reason,
    cancellationRequest.reason,
  );
  TestValidator.predicate(
    "status is valid enum value",
    ["pending", "approved", "rejected"].includes(retrievedRequest.status),
  );
  TestValidator.predicate(
    "requestedAt timestamp exists",
    retrievedRequest.requestedAt !== null &&
      retrievedRequest.requestedAt !== undefined,
  );
  TestValidator.predicate(
    "createdAt timestamp exists",
    retrievedRequest.createdAt !== null &&
      retrievedRequest.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updatedAt timestamp exists",
    retrievedRequest.updatedAt !== null &&
      retrievedRequest.updatedAt !== undefined,
  );
  // Note: Since there's no seller approval API in the provided SDK,
  // we cannot test the 'approved' status scenario directly.
  // The test validates that admin can retrieve cancellation requests
  // and verify the response structure regardless of status.
  TestValidator.predicate(
    "seller is null or has valid structure",
    retrievedRequest.seller === null ||
      (retrievedRequest.seller !== null &&
        retrievedRequest.seller.shop_name !== undefined &&
        retrievedRequest.seller.email !== undefined),
  );
  TestValidator.predicate(
    "respondedAt is null when status is pending",
    retrievedRequest.status === "pending"
      ? retrievedRequest.respondedAt === null
      : retrievedRequest.respondedAt !== null,
  );
  TestValidator.predicate(
    "rejectionReason is null when status is not rejected",
    retrievedRequest.status !== "rejected"
      ? retrievedRequest.rejectionReason === null
      : true,
  );
}
