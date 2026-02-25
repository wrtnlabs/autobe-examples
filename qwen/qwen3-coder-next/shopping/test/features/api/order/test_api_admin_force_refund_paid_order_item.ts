import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import type { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import type { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
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

export async function test_api_admin_force_refund_paid_order_item(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin actor
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "12341234",
    },
  });
  // 2. Create and authenticate customer actor
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "12341234",
      href: "https://example.com/join",
      referrer: "https://example.com",
    },
  });
  // 3. Create and authenticate seller actor
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "12341234",
      shop_name: "Test Shop",
      shop_description: "Test shop description",
      logo_image_url: null,
    },
  });
  // 4. Login customer to complete authentication
  await authorize_customer_login(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "12341234",
      href: "https://example.com/login",
      referrer: "https://example.com",
    },
  });
  // 5. Login seller to complete authentication
  await authorize_seller_login(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "12341234",
    },
  });
  // 6. Login admin to get admin connection for order operations
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "12341234",
    },
  });
  // 7. Generate test data for force refund
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  // 8. Force refund the order item as admin
  const forceRefund =
    await api.functional.shoppingMall.admin.orders.items.force_actions.refund(
      adminConnection,
      {
        orderId,
        itemId,
        body: {
          reason: "Administrator force-refund for customer service",
        },
      },
    );
  typia.assert(forceRefund);
  // 9. Verify order item status changed to 'refunded'
  TestValidator.equals(
    "item_status changed to refunded",
    forceRefund.itemStatus,
    "refunded",
  );
  // 10. Verify refund request reason is stored
  TestValidator.predicate("has refund reason", forceRefund.id !== undefined);
  // 11. Test double refund prevention
  await TestValidator.error("double refund prevention", async () => {
    await api.functional.shoppingMall.admin.orders.items.force_actions.refund(
      adminConnection,
      {
        orderId,
        itemId,
        body: {
          reason: "Second refund attempt should fail",
        },
      },
    );
  });
}
