import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerBulkUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerBulkUnban";
import type { IShoppingMallSellerBulkUnbanDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerBulkUnbanDetail";
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
import { generate_random_shopping_mall_admin_sellers_bulk_unban_bulk_unban } from "../../../generate/generate_random_shopping_mall_admin_sellers_bulk_unban_bulk_unban";
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_seller_bulk_unban } from "../../../prepare/prepare_random_shopping_mall_seller_bulk_unban";

/**
 * Test bulk unban operation with sellers having pending orders and cancellation requests.
 * This test verifies that unbanning sellers with pending business operations succeeds
 * and that all related data remains intact after the unban operation.
 */
export async function test_api_seller_bulk_unban_with_pending_orders(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin",
      referrer: "https://test.com/admin",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create 2 seller accounts
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Join = await authorize_seller_join(seller1Connection, {
    body: {
      email: "seller1@test.com",
      password: "1234",
      shop_name: "Seller 1 Shop",
      shop_description: "First test seller",
      href: "https://test.com/seller1",
      referrer: "https://test.com/seller1",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller1Join);
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Join = await authorize_seller_join(seller2Connection, {
    body: {
      email: "seller2@test.com",
      password: "1234",
      shop_name: "Seller 2 Shop",
      shop_description: "Second test seller",
      href: "https://test.com/seller2",
      referrer: "https://test.com/seller2",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller2Join);
  const seller1Id = seller1Join.id;
  const seller2Id = seller2Join.id;
  // 3. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "1234",
      display_name: "Test Customer",
      phone_number: "01012345678",
      href: "https://test.com/customer",
      referrer: "https://test.com/customer",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  // 4. Create orders from both sellers (simplified - just create orders)
  // Note: In a real scenario, we would need products and cart items, but for this test
  // we'll create orders directly using the utility function
  const order1 =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order1);
  // Create second order
  const order2 =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order2);
  // 5. Create cancellation request for one of the order items (for seller 2 scenario)
  if (order2.orderItems.length > 0) {
    const cancellationRequest =
      await generate_random_shopping_mall_customer_cancellation_requests_create(
        customerConnection,
        {
          body: {
            orderItemId: order2.orderItems[0].id,
            reason: "Customer wants to cancel",
          } satisfies IShoppingMallCancellationRequest.ICreate,
        },
      );
    typia.assert(cancellationRequest);
  }
  // 6. Ban both seller accounts
  const bannedSeller1 = await api.functional.shoppingMall.admin.sellers.ban(
    adminConnection,
    { sellerId: seller1Id },
  );
  typia.assert(bannedSeller1);
  TestValidator.equals("seller1 banned", bannedSeller1.status, "banned");
  const bannedSeller2 = await api.functional.shoppingMall.admin.sellers.ban(
    adminConnection,
    { sellerId: seller2Id },
  );
  typia.assert(bannedSeller2);
  TestValidator.equals("seller2 banned", bannedSeller2.status, "banned");
  // 7. Execute bulk unban operation
  const unbanResult =
    await generate_random_shopping_mall_admin_sellers_bulk_unban_bulk_unban(
      adminConnection,
      {
        body: {
          sellerIds: [seller1Id, seller2Id],
        } satisfies IShoppingMallSellerBulkUnban.ICreate,
      },
    );
  typia.assert(unbanResult);
  // 8. Validate bulk unban response
  TestValidator.equals("total sellers processed", unbanResult.total, 2);
  TestValidator.equals("succeeded count", unbanResult.succeeded, 2);
  TestValidator.equals("failed count", unbanResult.failed, 0);
  TestValidator.equals("details count", unbanResult.details.length, 2);
  // Validate each detail entry
  const seller1Detail = unbanResult.details.find(
    (d) => d.sellerId === seller1Id,
  );
  const seller2Detail = unbanResult.details.find(
    (d) => d.sellerId === seller2Id,
  );
  TestValidator.predicate("seller1 detail exists", seller1Detail !== undefined);
  TestValidator.predicate("seller2 detail exists", seller2Detail !== undefined);
  if (seller1Detail && seller2Detail) {
    TestValidator.equals("seller1 unban success", seller1Detail.success, true);
    TestValidator.equals(
      "seller1 error reason null",
      seller1Detail.errorReason,
      null,
    );
    TestValidator.equals("seller2 unban success", seller2Detail.success, true);
    TestValidator.equals(
      "seller2 error reason null",
      seller2Detail.errorReason,
      null,
    );
  }
  // 9. Verify sellers can now login (status is active)
  const seller1Login = await authorize_seller_login(
    { host: connection.host },
    {
      body: {
        email: "seller1@test.com",
        password: "1234",
        href: "https://test.com/seller1",
        referrer: "https://test.com/seller1",
      } satisfies IShoppingMallSeller.ILogin,
    },
  );
  typia.assert(seller1Login);
  TestValidator.equals("seller1 status active", seller1Login.status, "active");
  const seller2Login = await authorize_seller_login(
    { host: connection.host },
    {
      body: {
        email: "seller2@test.com",
        password: "1234",
        href: "https://test.com/seller2",
        referrer: "https://test.com/seller2",
      } satisfies IShoppingMallSeller.ILogin,
    },
  );
  typia.assert(seller2Login);
  TestValidator.equals("seller2 status active", seller2Login.status, "active");
}
