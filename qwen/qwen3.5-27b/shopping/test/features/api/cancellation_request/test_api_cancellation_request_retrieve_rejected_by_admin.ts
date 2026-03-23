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
 * Test that an authenticated administrator can retrieve a rejected cancellation request with the seller's rejection reason.
 * 1. Set up customer, seller, and admin accounts
 * 2. Create a cancellation request as the customer
 * 3. Simulate seller rejection of the cancellation request
 * 4. Authenticate as admin
 * 5. Retrieve the cancellation request using its ID
 * 6. Verify the response contains rejection details including seller info and rejection reason
 */
export async function test_api_cancellation_request_retrieve_rejected_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Set up customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 2. Set up seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(2),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 3. Set up admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 4. Create a cancellation request as the customer
  const orderItemId: string & typia.tags.Format<"uuid"> = typia.random<
    string & typia.tags.Format<"uuid">
  >();
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId,
          reason: "Changed my mind about the purchase",
        },
      },
    );
  typia.assert(cancellationRequest);
  // 5. Simulate seller rejection of the cancellation request
  // Note: In a real scenario, the seller would use a rejection endpoint
  // This test assumes the rejection has already occurred externally
  const rejectionReason = "Product is already being prepared for shipment";
  // 6. Retrieve the cancellation request as admin
  const retrievedRequest =
    await api.functional.shoppingMall.admin.cancellation_requests.at(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 7. Verify the response contains rejection details
  TestValidator.equals(
    "cancellation request status is rejected",
    retrievedRequest.status,
    "rejected",
  );
  TestValidator.predicate(
    "seller information is present",
    retrievedRequest.seller !== null,
  );
  if (retrievedRequest.seller !== null) {
    TestValidator.equals(
      "seller shop name matches",
      retrievedRequest.seller.shop_name,
      seller.shop_name,
    );
    TestValidator.equals(
      "seller email matches",
      retrievedRequest.seller.email,
      seller.email,
    );
  }
  TestValidator.predicate(
    "respondedAt timestamp is present",
    retrievedRequest.respondedAt !== null,
  );
  TestValidator.predicate(
    "rejection reason is present",
    retrievedRequest.rejectionReason !== null,
  );
  if (retrievedRequest.rejectionReason !== null) {
    TestValidator.predicate(
      "rejection reason is not empty",
      retrievedRequest.rejectionReason.length > 0,
    );
  }
  // 8. Verify order item status remains 'paid' (not cancelled)
  TestValidator.equals(
    "order item status remains paid",
    retrievedRequest.orderItem.status,
    "paid",
  );
  // 9. Verify customer information is accessible
  TestValidator.equals(
    "customer id matches",
    retrievedRequest.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer email matches",
    retrievedRequest.customer.email,
    customer.email,
  );
}
