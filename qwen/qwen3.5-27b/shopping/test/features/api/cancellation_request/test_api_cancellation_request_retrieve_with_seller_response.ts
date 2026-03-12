import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test that an authenticated administrator can retrieve a cancellation request
 * that has been responded to by a seller (approved or rejected).
 *
 * This test verifies the complete cancellation request workflow:
 * 1. Admin, seller, and customer accounts are created
 * 2. Customer places an order and creates a cancellation request
 * 3. Seller responds to the cancellation request (approves or rejects)
 * 4. Admin retrieves the cancellation request and validates the response data
 */
export async function test_api_cancellation_request_retrieve_with_seller_response(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin/join",
      referrer: "https://test.com",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "1234",
      shop_name: "Test Shop",
      href: "https://test.com/seller/join",
      referrer: "https://test.com",
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 3. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "1234",
      display_name: "Test Customer",
      href: "https://test.com/customer/join",
      referrer: "https://test.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 4. Customer creates order
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // 5. Customer creates cancellation request for an order item
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order.orderItems[0].id,
          reason: "Changed my mind",
        } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 6. Seller responds to the cancellation request (approve)
  const approvedRequest =
    await api.functional.shoppingMall.seller.cancellationRequests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 7. Admin retrieves the approved cancellation request
  const retrievedApproved =
    await api.functional.shoppingMall.admin.cancellationRequests.at(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(retrievedApproved);
  // 8. Validate approved cancellation request
  TestValidator.equals(
    "status is approved",
    retrievedApproved.status,
    "approved",
  );
  TestValidator.equals(
    "seller is populated",
    retrievedApproved.seller?.email,
    "seller@test.com",
  );
  TestValidator.predicate(
    "respondedAt is not null",
    retrievedApproved.respondedAt !== null,
  );
  TestValidator.equals(
    "rejectionReason is null",
    retrievedApproved.rejectionReason,
    null,
  );
  // 9. Create another cancellation request for testing rejection
  const order2 =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order2);
  const cancellationRequest2 =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order2.orderItems[0].id,
          reason: "Wrong item",
        } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest2);
  // 10. Seller rejects the cancellation request
  const rejectedRequest =
    await api.functional.shoppingMall.seller.cancellationRequests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest2.id,
        body: {
          status: "rejected",
          rejection_reason: "Item already prepared for shipment",
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  // 11. Admin retrieves the rejected cancellation request
  const retrievedRejected =
    await api.functional.shoppingMall.admin.cancellationRequests.at(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest2.id,
      },
    );
  typia.assert(retrievedRejected);
  // 12. Validate rejected cancellation request
  TestValidator.equals(
    "status is rejected",
    retrievedRejected.status,
    "rejected",
  );
  TestValidator.equals(
    "seller is populated",
    retrievedRejected.seller?.email,
    "seller@test.com",
  );
  TestValidator.predicate(
    "respondedAt is not null",
    retrievedRejected.respondedAt !== null,
  );
  TestValidator.equals(
    "rejectionReason contains explanation",
    retrievedRejected.rejectionReason,
    "Item already prepared for shipment",
  );
}
