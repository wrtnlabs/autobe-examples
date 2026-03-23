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
 * Test seller rejection of customer cancellation request with rejection reason.
 *
 * This test validates the complete workflow where:
 * 1. A seller and customer are registered and authenticated
 * 2. A cancellation request is created by the customer
 * 3. The seller rejects the cancellation request with a specific reason
 * 4. The rejection is properly recorded with timestamp and seller information
 */
export async function test_api_cancellation_request_seller_reject_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "12345678",
      shop_name: "Test Shop",
      shop_description: "Test shop for cancellation rejection",
      href: "https://test.com/seller/join",
      referrer: "https://test.com",
    },
  });
  typia.assert(sellerAuth);
  // 2. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "12345678",
      display_name: "Test Customer",
      phone_number: "01012345678",
      href: "https://test.com/customer/join",
      referrer: "https://test.com",
    },
  });
  typia.assert(customerAuth);
  // 3. Customer creates a cancellation request
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          reason: "Changed my mind about the purchase",
        },
      },
    );
  typia.assert(cancellationRequest);
  // Verify initial state
  TestValidator.equals(
    "initial status is pending",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.equals(
    "initial seller is null",
    cancellationRequest.seller,
    null,
  );
  TestValidator.equals(
    "initial respondedAt is null",
    cancellationRequest.respondedAt,
    null,
  );
  TestValidator.equals(
    "initial rejectionReason is null",
    cancellationRequest.rejectionReason,
    null,
  );
  // 4. Seller rejects the cancellation request with a reason
  const rejectionReason = "Item already prepared for shipment";
  const updatedCancellationRequest =
    await api.functional.shoppingMall.admin.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        },
      },
    );
  typia.assert(updatedCancellationRequest);
  // 5. Validate rejection
  TestValidator.equals(
    "status changed to rejected",
    updatedCancellationRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    updatedCancellationRequest.rejectionReason,
    rejectionReason,
  );
  TestValidator.predicate(
    "respondedAt is set",
    updatedCancellationRequest.respondedAt !== null,
  );
  TestValidator.predicate(
    "seller is populated",
    updatedCancellationRequest.seller !== null,
  );
  TestValidator.equals(
    "seller ID matches responding seller",
    updatedCancellationRequest.seller!.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "order item status remains paid",
    updatedCancellationRequest.orderItem.status,
    "paid",
  );
}
