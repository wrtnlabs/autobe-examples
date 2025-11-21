import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Test shipment deletion validation logic and error handling. Create multiple
 * shipments for different orders and test deletion scenarios including valid
 * deletion requests, attempts to delete non-existent shipments, and deletion of
 * shipments belonging to different orders. Verify that the system properly
 * validates the order-shipment relationship before allowing deletion and
 * returns appropriate error messages for invalid requests. Test that deletion
 * operations are properly secured and require administrative privileges.
 */
export async function test_api_shipment_deletion_validation(
  connection: api.IConnection,
) {
  // Step 1: Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "password123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create first order
  const order1 = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        currency: "USD",
        shipping_address: "123 Main St, City, State 12345",
        billing_address: "123 Main St, City, State 12345",
        items: ArrayUtil.repeat(2, () => ({
          shopping_mall_product_variant_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        })) satisfies IShoppingMallOrderItem.ICreate[],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order1);

  // Step 3: Create second order
  const order2 = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        currency: "USD",
        shipping_address: "456 Oak St, City, State 67890",
        billing_address: "456 Oak St, City, State 67890",
        items: ArrayUtil.repeat(1, () => ({
          shopping_mall_product_variant_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        })) satisfies IShoppingMallOrderItem.ICreate[],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order2);

  // Step 4: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "support_admin",
      permissions: JSON.stringify({ shipment_management: true }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 5: Create shipment for first order
  const shipment1 =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderId: order1.id,
        body: {
          carrier: "UPS",
          tracking_number: RandomGenerator.alphaNumeric(12),
          shipping_method: "standard",
          shipping_cost: 12.99,
          status: "label_created",
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment1);

  // Step 6: Create shipment for second order
  const shipment2 =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderId: order2.id,
        body: {
          carrier: "FedEx",
          tracking_number: RandomGenerator.alphaNumeric(12),
          shipping_method: "express",
          shipping_cost: 24.99,
          status: "label_created",
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment2);

  // Step 7: Test successful deletion of shipment1
  await api.functional.shoppingMall.orders.shipments.erase(connection, {
    orderId: order1.id,
    shipmentId: shipment1.id,
  });

  // Step 8: Test deletion of non-existent shipment
  await TestValidator.error(
    "non-existent shipment deletion should fail",
    async () => {
      await api.functional.shoppingMall.orders.shipments.erase(connection, {
        orderId: order1.id,
        shipmentId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // Step 9: Test cross-order shipment deletion prevention
  await TestValidator.error(
    "cross-order shipment deletion should fail",
    async () => {
      await api.functional.shoppingMall.orders.shipments.erase(connection, {
        orderId: order1.id,
        shipmentId: shipment2.id,
      });
    },
  );

  // Step 10: Test customer cannot delete shipments
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "password123",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  await TestValidator.error(
    "customer should not have shipment deletion permissions",
    async () => {
      await api.functional.shoppingMall.orders.shipments.erase(connection, {
        orderId: order2.id,
        shipmentId: shipment2.id,
      });
    },
  );

  // Step 11: Switch back to admin and delete remaining shipment
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      href: "https://example.com/admin/login",
      referrer: "https://example.com/admin",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  await api.functional.shoppingMall.orders.shipments.erase(connection, {
    orderId: order2.id,
    shipmentId: shipment2.id,
  });
}
