import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_checkout_create";
import { generate_random_ecommerce_mall_seller_ecommerce_mall_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_ecommerce_mall_variants_inventory_create";
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_shipment_retrieval_multi_seller_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  // 2. Create shipping address for customer
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          streetAddress: "123 Test Street",
          city: "Test City",
          state: "Test State",
          postalCode: "12345",
          country: "Test Country",
          isDefault: true,
        },
      },
    );
  typia.assert(address);
  // 3. Register and authenticate as first seller
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {});
  // 4. First seller creates product with variant and inventory
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    seller1Connection,
    {
      body: {
        name: `Seller1 Product - ${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  const variant1 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      seller1Connection,
      {
        params: { productId: product1.id },
        body: {
          skuCode: `SKU-SELLER1-${RandomGenerator.alphaNumeric(6)}`,
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
        },
      },
    );
  typia.assert(variant1);
  await generate_random_ecommerce_mall_seller_ecommerce_mall_variants_inventory_create(
    seller1Connection,
    {
      params: { variantId: variant1.id },
      body: {
        quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        operationType: "restock",
        reason: "initial stock",
      },
    },
  );
  // 5. Register and authenticate as second seller
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {});
  // 6. Second seller creates product with variant and inventory
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    seller2Connection,
    {
      body: {
        name: `Seller2 Product - ${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  const variant2 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      seller2Connection,
      {
        params: { productId: product2.id },
        body: {
          skuCode: `SKU-SELLER2-${RandomGenerator.alphaNumeric(6)}`,
          optionValues: [
            { key: "color", value: "Blue" },
            { key: "size", value: "Medium" },
          ],
        },
      },
    );
  typia.assert(variant2);
  await generate_random_ecommerce_mall_seller_ecommerce_mall_variants_inventory_create(
    seller2Connection,
    {
      params: { variantId: variant2.id },
      body: {
        quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        operationType: "restock",
        reason: "initial stock",
      },
    },
  );
  // 7. Customer adds items from both sellers to cart
  await api.functional.ecommerceMall.customer.ecommerceMall.cart.items.create(
    customerConnection,
    {
      body: {
        variantId: variant1.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
      },
    },
  );
  await api.functional.ecommerceMall.customer.ecommerceMall.cart.items.create(
    customerConnection,
    {
      body: {
        variantId: variant2.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
      },
    },
  );
  // 8. Customer completes checkout
  const order =
    await generate_random_ecommerce_mall_customer_customers_checkout_create(
      customerConnection,
      {
        body: {
          shippingAddressId: address.id,
        },
      },
    );
  typia.assert(order);
  // Extract order item IDs for each seller
  const orderItems1 = order.orderItems.filter(
    (item) => item.productSnapshot.seller.id === seller1.id,
  );
  const orderItems2 = order.orderItems.filter(
    (item) => item.productSnapshot.seller.id === seller2.id,
  );
  TestValidator.equals(
    "first seller has order items",
    orderItems1.length > 0,
    true,
  );
  TestValidator.equals(
    "second seller has order items",
    orderItems2.length > 0,
    true,
  );
  // 9. First seller creates shipment for their items
  const shipment1 =
    await generate_random_ecommerce_mall_seller_orders_shipments_create(
      seller1Connection,
      {
        params: { orderId: order.id },
        body: {
          orderItemIds: orderItems1.map((item) => item.id),
          carrier: "FedEx",
          trackingNumber: "FEDEX123456789",
        },
      },
    );
  typia.assert(shipment1);
  // 10. Second seller creates separate shipment for their items
  const shipment2 =
    await generate_random_ecommerce_mall_seller_orders_shipments_create(
      seller2Connection,
      {
        params: { orderId: order.id },
        body: {
          orderItemIds: orderItems2.map((item) => item.id),
          carrier: "UPS",
          trackingNumber: "UPS987654321",
        },
      },
    );
  typia.assert(shipment2);
  // 11. Retrieve first shipment (public endpoint) and verify it contains only that seller's items
  const retrievedShipment1 =
    await api.functional.ecommerceMall.orders.shipments.at(customerConnection, {
      orderId: order.id,
      shipmentId: shipment1.id,
    });
  typia.assert(retrievedShipment1);
  TestValidator.equals(
    "shipment1 has correct carrier",
    retrievedShipment1.carrier,
    "FedEx",
  );
  TestValidator.equals(
    "shipment1 has correct tracking number",
    retrievedShipment1.tracking_number,
    "FEDEX123456789",
  );
  TestValidator.equals(
    "shipment1 belongs to order",
    retrievedShipment1.order.id,
    order.id,
  );
  TestValidator.equals(
    "shipment1 belongs to seller1",
    retrievedShipment1.seller.id,
    seller1.id,
  );
  TestValidator.equals(
    "shipment1 item count matches",
    retrievedShipment1.shipmentItems.length,
    orderItems1.length,
  );
  // Verify all items in shipment1 belong to seller1
  for (const shipmentItem of retrievedShipment1.shipmentItems) {
    TestValidator.equals(
      "shipment1 item belongs to seller1",
      shipmentItem.orderItem.productSnapshot.seller.id,
      seller1.id,
    );
    TestValidator.predicate(
      "shipment1 item has product snapshot with name",
      shipmentItem.orderItem.productSnapshot.name.length > 0,
    );
    TestValidator.predicate(
      "shipment1 item has product variant with SKU",
      shipmentItem.orderItem.productVariant.sku_code.length > 0,
    );
  }
  // 12. Retrieve second shipment (public endpoint) and verify it contains only that seller's items
  const retrievedShipment2 =
    await api.functional.ecommerceMall.orders.shipments.at(customerConnection, {
      orderId: order.id,
      shipmentId: shipment2.id,
    });
  typia.assert(retrievedShipment2);
  TestValidator.equals(
    "shipment2 has correct carrier",
    retrievedShipment2.carrier,
    "UPS",
  );
  TestValidator.equals(
    "shipment2 has correct tracking number",
    retrievedShipment2.tracking_number,
    "UPS987654321",
  );
  TestValidator.equals(
    "shipment2 belongs to order",
    retrievedShipment2.order.id,
    order.id,
  );
  TestValidator.equals(
    "shipment2 belongs to seller2",
    retrievedShipment2.seller.id,
    seller2.id,
  );
  TestValidator.equals(
    "shipment2 item count matches",
    retrievedShipment2.shipmentItems.length,
    orderItems2.length,
  );
  // Verify all items in shipment2 belong to seller2
  for (const shipmentItem of retrievedShipment2.shipmentItems) {
    TestValidator.equals(
      "shipment2 item belongs to seller2",
      shipmentItem.orderItem.productSnapshot.seller.id,
      seller2.id,
    );
    TestValidator.predicate(
      "shipment2 item has product snapshot with name",
      shipmentItem.orderItem.productSnapshot.name.length > 0,
    );
    TestValidator.predicate(
      "shipment2 item has product variant with SKU",
      shipmentItem.orderItem.productVariant.sku_code.length > 0,
    );
  }
  // Verify shipments have different item counts based on each seller's contribution
  TestValidator.notEquals(
    "shipment1 and shipment2 have different item counts",
    retrievedShipment1.shipmentItems.length,
    retrievedShipment2.shipmentItems.length,
  );
  // Verify no overlap between shipment items
  const shipment1ItemIds = new Set(
    retrievedShipment1.shipmentItems.map((i) => i.orderItem.id),
  );
  const shipment2ItemIds = new Set(
    retrievedShipment2.shipmentItems.map((i) => i.orderItem.id),
  );
  for (const id of shipment1ItemIds) {
    TestValidator.equals(
      "shipment1 item not in shipment2",
      shipment2ItemIds.has(id),
      false,
    );
  }
  for (const id of shipment2ItemIds) {
    TestValidator.equals(
      "shipment2 item not in shipment1",
      shipment1ItemIds.has(id),
      false,
    );
  }
}
