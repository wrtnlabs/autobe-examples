import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { generate_random_ecommerce_mall_customer_customers_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_checkout_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_shipment_deletion_before_delivery(connection: api.IConnection): Promise<void> {
    // 1. Authenticate customer and seller
    const customerConnection: api.IConnection = { host: connection.host };
    const customerAuth = await api.functional.ecommerceMall.auth.customer.join(customerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    typia.assert(customerAuth);
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerAuth = await api.functional.ecommerceMall.auth.seller.join(sellerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    typia.assert(sellerAuth);
    // 2. Customer creates shipping address
    const address = await api.functional.ecommerceMall.customer.customers.addresses.create(customerConnection, {
        body: {
            recipientName: RandomGenerator.name(),
            phone: RandomGenerator.mobile(),
            streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
            city: RandomGenerator.alphabets(5),
            state: RandomGenerator.alphabets(5),
            postalCode: "12345",
            country: "Korea",
            isDefault: true,
        },
    });
    typia.assert(address);
    // 3-4. Create order via checkout (this handles product/cart setup)
    const order = await api.functional.ecommerceMall.customer.customers.checkout.create(customerConnection, {
        body: {},
    });
    typia.assert(order);
    // Get order item IDs from the created order
    const orderItemIds = order.orderItems.map((item) => item.id);
    // 5. Seller creates shipment for the order
    const shipment = await api.functional.ecommerceMall.seller.orders.shipments.create(sellerConnection, {
        orderId: order.id,
        body: {
            orderItemIds: orderItemIds satisfies (string & tags.Format<"uuid">)[] & tags.MinItems<1>,
            carrier: "DHL",
            trackingNumber: "TRACK123456",
        },
    });
    typia.assert(shipment);
    // Verify shipment was created successfully
    TestValidator.equals("shipment has items", shipment.shipmentItems.length > 0, true);
    TestValidator.equals("shipment carrier", shipment.carrier, "DHL");
    TestValidator.equals("shipment tracking number", shipment.tracking_number, "TRACK123456");
    // Verify order items status changed to 'shipped'
    for (const item of order.orderItems) {
        TestValidator.equals("order item status is shipped", item.status, "shipped");
    }
    // 6. Seller deletes the shipment - expect 204 No Content
    await api.functional.ecommerceMall.seller.orders.shipments.erase(sellerConnection, {
        orderId: order.id,
        shipmentId: shipment.id,
    });
    // 7. Verify shipment is soft-deleted (deleted_at is set)
    TestValidator.predicate("shipment soft deleted", shipment.deleted_at !== null);
    // 8. Verify order items still exist and remain in 'shipped' status
    // (they can be reshipped in a new shipment)
    for (const item of order.orderItems) {
        TestValidator.equals("order item still shipped after deletion", item.status, "shipped");
    }
    // 9. Verify shipment_items junction records are removed (empty array)
    TestValidator.equals("shipment items removed", shipment.shipmentItems.length, 0);
}