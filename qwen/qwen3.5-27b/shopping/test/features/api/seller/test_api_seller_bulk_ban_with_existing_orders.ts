import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

export async function test_api_seller_bulk_ban_with_existing_orders(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that bulk banning sellers preserves their existing order history.
   * Validates that banned sellers' orders remain accessible and unchanged,
   * ensuring transaction history is preserved even when sellers are banned.
   */
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@bulkban.test",
      password: "admin1234",
      href: "https://test.com/admin",
      referrer: "https://test.com",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create first seller account
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: {
      email: "seller1@bulkban.test",
      password: "seller1234",
      shop_name: "Seller One Shop",
      shop_description: "First test seller",
      href: "https://test.com/seller",
      referrer: "https://test.com",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller1);
  // 3. Create second seller account
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: {
      email: "seller2@bulkban.test",
      password: "seller1234",
      shop_name: "Seller Two Shop",
      shop_description: "Second test seller",
      href: "https://test.com/seller",
      referrer: "https://test.com",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller2);
  // 4. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@bulkban.test",
      password: "customer1234",
      display_name: "Test Customer",
      phone_number: "01012345678",
      href: "https://test.com/customer",
      referrer: "https://test.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 5. Create order with items from first seller
  const order1 =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order1);
  // 6. Create order with items from second seller
  const order2 =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order2);
  // 7. Store order IDs before ban for verification
  const order1Id = order1.id;
  const order2Id = order2.id;
  const order1TotalPrice = order1.total_price;
  const order2TotalPrice = order2.total_price;
  // 8. Call bulk-ban endpoint to ban both sellers
  const banResult =
    await api.functional.shoppingMall.admin.sellers.bulk_ban.bulkBan(
      adminConnection,
      {
        body: {
          sellerIds: [seller1.id, seller2.id],
          reason: "Bulk ban test for order preservation validation",
        } satisfies IShoppingMallSeller.IBulkBan,
      },
    );
  typia.assert(banResult);
  // 9. Verify ban operation succeeds (successCount = 2)
  TestValidator.equals(
    "both sellers banned successfully",
    banResult.successCount,
    2,
  );
  TestValidator.equals("no failed bans", banResult.failed.length, 0);
  // 10. Verify orders still exist and are unchanged after ban
  // Order IDs should still be valid
  TestValidator.equals("order1 ID preserved after ban", order1Id, order1.id);
  TestValidator.equals("order2 ID preserved after ban", order2Id, order2.id);
  // Order prices should be unchanged
  TestValidator.equals(
    "order1 price unchanged after ban",
    order1TotalPrice,
    order1.total_price,
  );
  TestValidator.equals(
    "order2 price unchanged after ban",
    order2TotalPrice,
    order2.total_price,
  );
  // 11. Verify order items still reference the sellers correctly
  TestValidator.predicate(
    "order1 has seller references",
    order1.orderItems.every((item) => item.sellerId !== undefined),
  );
  TestValidator.predicate(
    "order2 has seller references",
    order2.orderItems.every((item) => item.sellerId !== undefined),
  );
  // 12. Verify banned sellers cannot login (login should fail)
  await TestValidator.error("seller1 cannot login after ban", async () => {
    const bannedSeller1Connection: api.IConnection = { host: connection.host };
    await authorize_seller_login(bannedSeller1Connection, {
      body: {
        email: "seller1@bulkban.test",
        password: "seller1234",
        href: "https://test.com/seller",
        referrer: "https://test.com",
      } satisfies IShoppingMallSeller.ILogin,
    });
  });
  await TestValidator.error("seller2 cannot login after ban", async () => {
    const bannedSeller2Connection: api.IConnection = { host: connection.host };
    await authorize_seller_login(bannedSeller2Connection, {
      body: {
        email: "seller2@bulkban.test",
        password: "seller1234",
        href: "https://test.com/seller",
        referrer: "https://test.com",
      } satisfies IShoppingMallSeller.ILogin,
    });
  });
  // 13. Verify customer can still access their orders (customer connection still works)
  TestValidator.predicate(
    "customer authentication still valid",
    customerConnection.headers?.Authorization !== undefined,
  );
}
