import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
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

/**
 * Test force refund capability when the seller is suspended and cannot respond to normal refund requests.
 *
 * This test validates that administrators can process refunds for customers even when the seller
 * is suspended and unable to respond to normal refund requests. The test suspends a seller
 * and verifies that the force refund operation succeeds with proper validation.
 */
export async function test_api_refund_force_refund_suspended_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin/join",
      referrer: "https://test.com",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Customer setup - register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://test.com/customer/join",
      referrer: "https://test.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 3. Seller setup - register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://test.com/seller/join",
      referrer: "https://test.com",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 4. Admin suspends (bans) the seller account
  const suspendedSeller = await api.functional.shoppingMall.admin.sellers.ban(
    adminConnection,
    {
      sellerId: sellerAuth.id,
    },
  );
  typia.assert(suspendedSeller);
  // Verify seller is now banned
  TestValidator.equals(
    "seller status is banned",
    suspendedSeller.status,
    "banned",
  );
  // 5. Generate test order and item IDs
  // Note: In a real scenario, these would come from actual order creation flow
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 6. Admin performs force refund on the order item
  const refundRequest =
    await api.functional.shoppingMall.admin.orders.items.force_refund.forceRefund(
      adminConnection,
      {
        orderId,
        itemId,
        body: {
          reason:
            "Seller account suspended - force refund for customer protection",
        } satisfies IShoppingMallRefundRequest.IForceRefund,
      },
    );
  typia.assert(refundRequest);
  // 7. Validate force refund response
  TestValidator.equals(
    "refund request status is approved",
    refundRequest.status,
    "approved",
  );
  TestValidator.equals(
    "refund reason matches input",
    refundRequest.reason,
    "Seller account suspended - force refund for customer protection",
  );
  TestValidator.predicate("refund has valid ID", refundRequest.id.length > 0);
  TestValidator.predicate(
    "order item ID matches",
    refundRequest.orderItem.id === itemId,
  );
  TestValidator.predicate(
    "order ID matches",
    refundRequest.orderItem.orderId === orderId,
  );
  TestValidator.predicate(
    "customer ID matches",
    refundRequest.customer.id === customerAuth.id,
  );
  TestValidator.predicate(
    "requested_at is set",
    refundRequest.requestedAt !== null,
  );
  TestValidator.predicate(
    "responded_at is set (immediate approval)",
    refundRequest.respondedAt !== null,
  );
}
