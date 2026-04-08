import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test viewing a multi-seller order with items fulfilled by different sellers.
 *
 * Validates that administrators can view complex orders containing items from multiple sellers, with mixed fulfillment states (some items shipped, some not), and verify that all seller attribution and pricing calculations are correct.
 *
 * 1. Administrator joins and authenticates
 * 2. Create multi-seller order with items from different sellers
 * 3. Create partial shipments (some items shipped, some not)
 * 4. Retrieve order via GET /ecommerceMall/administrator/orders/{id}
 * 5. Validate seller_display_name, shipment tracking, and total price
 */
export async function test_api_administrator_order_view_multi_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResponse = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(3),
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestAdmin123!",
    },
  });
  typia.assert(adminResponse);
  // 2. Create test order data simulating multi-seller order
  // Generate multiple seller IDs
  const sellerIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  // Generate seller summaries
  const sellers = sellerIds.map(
    (id) =>
      ({
        id,
        display_name: RandomGenerator.name(2),
        approval_status: "approved",
        is_suspended: false,
        created_at: new Date().toISOString(),
      }) satisfies IEcommerceMallSeller.ISummary,
  );
  // Create order items with different sellers
  const orderItems: IEcommerceMallOrderItem.ISummary[] = ArrayUtil.repeat(
    4,
    (index) => {
      const quantity = RandomGenerator.pick([1, 2, 3]) as number &
        tags.Type<"int32"> &
        tags.Minimum<1>;
      const unitPrice = typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
      >() satisfies number as number;
      const subtotal = quantity * unitPrice;
      return {
        id: typia.random<string & tags.Format<"uuid">>(),
        order_number: `ORD-${Date.now()}-${String(index).padStart(3, "0")}`,
        seller_display_name: sellers[index % sellers.length].display_name,
        product_variant_name: RandomGenerator.paragraph({ sentences: 1 }),
        product_variant_sku_code:
          RandomGenerator.alphaNumeric(10).toUpperCase(),
        product_variant_price: unitPrice,
        quantity,
        unit_price: unitPrice * 0.9,
        subtotal,
        status: RandomGenerator.pick(["paid", "shipped", "delivered"]) as
          | "paid"
          | "shipped"
          | "delivered"
          | "cancelled"
          | "refunded",
        created_at: new Date().toISOString(),
      } satisfies IEcommerceMallOrderItem.ISummary;
    },
  );
  // 3. Create shipments for some items (partial fulfillment)
  const shipments: IEcommerceMallShipment.ISummary[] = orderItems
    .filter((_, index) => index % 2 === 0) // Every other item is shipped
    .map((item, index) => {
      const shippingStatus = RandomGenerator.pick(["shipped", "delivered"]) as
        | "shipped"
        | "delivered";
      const shippedAt = new Date(
        Date.now() - 86400000 * RandomGenerator.pick([1, 2, 3]),
      ).toISOString();
      const deliveredAt =
        shippingStatus === "delivered"
          ? new Date(
              Date.now() - 86400000 * RandomGenerator.pick([0, 1]),
            ).toISOString()
          : undefined;
      return {
        id: typia.random<string & tags.Format<"uuid">>(),
        status: shippingStatus,
        carrier: RandomGenerator.pick(["FedEx", "DHL", "UPS"]),
        tracking_number: typia.random<string & tags.Format<"uuid">>(),
        shipped_at: shippedAt,
        delivered_at: deliveredAt,
        created_at: new Date().toISOString(),
        seller: sellers[index % sellers.length], // Different seller per shipment
      } satisfies IEcommerceMallShipment.ISummary;
    });
  // Calculate total price from items
  const totalPrice = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  // 4. Create order summary
  const orderNumber = `ORD-${Date.now()}`;
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const member: IEcommerceMallMember.ISummary = {
    id: memberId,
    email: typia.random<string & tags.Format<"email">>(),
    display_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  const shippingAddress: IEcommerceMallCustomerAddress.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    recipient_name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    street: RandomGenerator.paragraph({ sentences: 1 }),
    city: RandomGenerator.alphabets(10),
    state: RandomGenerator.alphabets(8),
    postal_code: typia
      .random<string & tags.Format<"email">>()
      .slice(0, 5)
      .toUpperCase(),
    country: "US",
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const order: IEcommerceMallOrder = {
    id: typia.random<string & tags.Format<"uuid">>(),
    order_number: orderNumber,
    status: "partial_completed",
    total_price: totalPrice,
    member,
    shippingAddress,
    items: orderItems,
    shipments,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  // 5. Retrieve the order via API
  const retrievedOrder: IEcommerceMallOrder =
    await api.functional.ecommerceMall.administrator.orders.getById(
      adminConnection,
      {
        id: order.id,
      },
    );
  typia.assert(retrievedOrder);
  // 6. Validate order structure and data
  // Verify order number matches
  TestValidator.equals(
    "order number",
    retrievedOrder.order_number,
    orderNumber,
  );
  // Verify total price equals sum of item subtotals
  const calculatedTotal = retrievedOrder.items.reduce(
    (sum, item) => sum + item.subtotal,
    0,
  );
  TestValidator.equals(
    "total price equals sum of item subtotals",
    retrievedOrder.total_price,
    calculatedTotal,
  );
  // Verify all items have seller_display_name
  retrievedOrder.items.forEach((item, index) => {
    TestValidator.predicate(
      `item ${index} has seller_display_name`,
      () =>
        item.seller_display_name !== undefined &&
        item.seller_display_name.length > 0,
    );
  });
  // Verify each item has product variant information
  retrievedOrder.items.forEach((item, index) => {
    TestValidator.predicate(
      `item ${index} has product variant name`,
      () =>
        item.product_variant_name !== undefined &&
        item.product_variant_name.length > 0,
    );
    TestValidator.predicate(
      `item ${index} has SKU code`,
      () =>
        item.product_variant_sku_code !== undefined &&
        item.product_variant_sku_code.length > 0,
    );
  });
  // Verify shipments contain tracking information for shipped items
  retrievedOrder.shipments.forEach((shipment) => {
    if (shipment.status === "shipped" || shipment.status === "delivered") {
      TestValidator.predicate(
        "shipment has tracking number when status is shipped/delivered",
        () =>
          shipment.tracking_number !== undefined &&
          shipment.tracking_number.length > 0,
      );
      TestValidator.predicate(
        "shipment has carrier",
        () => shipment.carrier !== undefined && shipment.carrier.length > 0,
      );
      TestValidator.predicate(
        "shipment has shipped_at",
        () => shipment.shipped_at !== undefined,
      );
    }
  });
  // Verify mixed fulfillment states in order items
  const hasShipped = retrievedOrder.items.some(
    (item) => item.status === "shipped" || item.status === "delivered",
  );
  const hasPaid = retrievedOrder.items.some((item) => item.status === "paid");
  TestValidator.predicate(
    "order has mixed fulfillment states",
    hasShipped && hasPaid,
  );
  // Verify shipping address is complete
  TestValidator.equals(
    "shipping address recipient",
    retrievedOrder.shippingAddress.recipient_name,
    shippingAddress.recipient_name,
  );
  TestValidator.equals(
    "shipping address city",
    retrievedOrder.shippingAddress.city,
    shippingAddress.city,
  );
  TestValidator.equals(
    "shipping address postal code",
    retrievedOrder.shippingAddress.postal_code,
    shippingAddress.postal_code,
  );
  // Verify member information
  TestValidator.equals(
    "member email",
    retrievedOrder.member.email,
    member.email,
  );
  TestValidator.equals(
    "member display name",
    retrievedOrder.member.display_name,
    member.display_name,
  );
}
