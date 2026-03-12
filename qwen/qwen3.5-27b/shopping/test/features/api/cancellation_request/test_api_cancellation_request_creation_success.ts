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
 * Test the primary success path for creating a cancellation request.
 *
 * This test validates that a customer can successfully create a cancellation
 * request for an order item that has 'paid' status (not yet shipped). The test
 * sets up the complete workflow including admin, seller, and customer accounts,
 * product creation, order placement, and finally the cancellation request.
 */
export async function test_api_cancellation_request_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin/join",
      referrer: "https://test.com/admin/join",
    },
  });
  // 2. Seller setup - register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "1234",
      shop_name: "Test Shop",
      shop_description: "Test shop description",
      href: "https://test.com/seller/join",
      referrer: "https://test.com/seller/join",
    },
  });
  // 3. Customer setup - register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinResult = await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "1234",
      display_name: "Test Customer",
      phone_number: "01012345678",
      href: "https://test.com/customer/join",
      referrer: "https://test.com/customer/join",
    },
  });
  const customerEmail = customerJoinResult.email;
  // 4. Generate cancellation request with proper setup
  // The utility function handles: seller approval, product creation, cart management, order placement
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {},
    );
  // 5. Validate response structure
  typia.assert(cancellationRequest);
  // 6. Business logic validations
  TestValidator.equals(
    "status is pending",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.equals(
    "seller is null (awaiting response)",
    cancellationRequest.seller,
    null,
  );
  TestValidator.equals(
    "rejection reason is null",
    cancellationRequest.rejectionReason,
    null,
  );
  TestValidator.equals(
    "responded at is null",
    cancellationRequest.respondedAt,
    null,
  );
  TestValidator.equals(
    "deleted at is null",
    cancellationRequest.deletedAt,
    null,
  );
  TestValidator.predicate(
    "has valid reason",
    cancellationRequest.reason.length > 0,
  );
  TestValidator.predicate(
    "requested at timestamp is set",
    cancellationRequest.requestedAt !== null,
  );
  TestValidator.predicate(
    "created at timestamp is set",
    cancellationRequest.createdAt !== null,
  );
  TestValidator.predicate(
    "updated at timestamp is set",
    cancellationRequest.updatedAt !== null,
  );
  TestValidator.predicate(
    "order item exists",
    cancellationRequest.orderItem !== null,
  );
  TestValidator.predicate(
    "customer information matches",
    cancellationRequest.customer.email === customerEmail,
  );
}
