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
 * Test seller approval of customer cancellation request.
 *
 * 1. Register and authenticate as a seller
 * 2. Register and authenticate as a customer
 * 3. Customer creates a cancellation request for an order item
 * 4. Seller approves the cancellation request
 * 5. Verify cancellation request status changes to 'approved'
 * 6. Verify order item status changes to 'cancelled'
 * 7. Verify seller_id is populated in cancellation request
 * 8. Verify responded_at timestamp is set
 */
export async function test_api_cancellation_request_seller_approve(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(2),
    },
  });
  typia.assert(seller);
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 3. Customer creates cancellation request
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {},
    );
  typia.assert(cancellationRequest);
  // Verify initial state
  TestValidator.equals(
    "cancellation request status is pending",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.equals(
    "seller is null before response",
    cancellationRequest.seller,
    null,
  );
  TestValidator.equals(
    "responded_at is null before response",
    cancellationRequest.respondedAt,
    null,
  );
  // 4. Seller approves the cancellation request
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
  // 5. Verify cancellation request status changes to 'approved'
  TestValidator.equals(
    "cancellation request status is approved",
    approvedRequest.status,
    "approved",
  );
  // 6. Verify seller_id is populated
  TestValidator.predicate(
    "seller is populated after approval",
    approvedRequest.seller !== null,
  );
  if (approvedRequest.seller !== null) {
    TestValidator.equals(
      "seller id matches responding seller",
      approvedRequest.seller.id,
      seller.id,
    );
  }
  // 7. Verify responded_at timestamp is set
  TestValidator.predicate(
    "responded_at is set after approval",
    approvedRequest.respondedAt !== null,
  );
  // 8. Verify order item status changes to 'cancelled'
  TestValidator.equals(
    "order item status is cancelled",
    approvedRequest.orderItem.status,
    "cancelled",
  );
}
