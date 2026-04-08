import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
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
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { generate_random_ecommerce_mall_customer_customers_me_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_addresses_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add";
import { generate_random_ecommerce_mall_customer_customers_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_cart_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_shipment_customer_tracking_retrieval(connection: api.IConnection): Promise<void> {
    // 1. Customer registration and authentication
    const customerConnection: api.IConnection = { host: connection.host };
    const customerAuth = await authorize_customer_join(customerConnection, {});
    typia.assert(customerAuth);
    // 2. Customer creates shipping address
    const shippingAddress = await api.functional.ecommerceMall.customer.customers.me.addresses.create(customerConnection, {
        body: {
            recipient_name: RandomGenerator.name(),
            phone: RandomGenerator.mobile(),
            street_address: `${randint(1, 999)} Random Street`,
            city: "Test City",
            state: "Test State",
            postal_code: "12345",
            country: "Test Country",
            is_default: true,
        } satisfies IEcommerceMallShippingAddress.ICreate,
    });
    typia.assert(shippingAddress);
    // 3. Seller registration and authentication
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerAuth = await authorize_seller_join(sellerConnection, {});
    typia.assert(sellerAuth);
    // 4. Admin registration, authentication, and seller approval
    const adminConnection: api.IConnection = { host: connection.host };
    const adminAuth = await authorize_admin_join(adminConnection, {});
    typia.assert(adminAuth);
    const approvedSeller = await api.functional.ecommerceMall.admin.admin.sellers.approve(adminConnection, {
        sellerId: sellerAuth.id,
    });
    typia.assert(approvedSeller);
    TestValidator.equals("seller approval status", approvedSeller.approvalStatus, "approved");
    // 5. Seller creates product and adds inventory
    const testCategoryId = "00000000-0000-0000-0000-000000000001";
    const product = await api.functional.ecommerceMall.seller.sellers.me.products.create(sellerConnection, {
        body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.content({ paragraphs: 2 }),
            basePrice: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
            categoryId: testCategoryId as string & tags.Format<"uuid">,
        } satisfies IEcommerceMallProduct.ICreate,
    });
    typia.assert(product);
    const variantId = product.variants[0]?.id;
    if (!variantId) {
        throw new Error("Product has no variants - need to create variant first");
    }
    // Add inventory to the variant
    const inventoryRecord = await api.functional.ecommerceMall.seller.sellers.me.variants._inventory.add(sellerConnection, {
        variantId: variantId,
        body: {
            quantityChange: typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>>(),
            reason: "restock",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
    });
    typia.assert(inventoryRecord);
    // 6. Customer adds product to cart and creates order
    const cartItem = await api.functional.ecommerceMall.customer.customers.me.cart.create(customerConnection, {
        body: {
            variantId: variantId,
            quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>>(),
        } satisfies IEcommerceMallCart.ICreate,
    });
    typia.assert(cartItem);
    const order = await api.functional.ecommerceMall.customer.customers.me.orders.create(customerConnection, {
        body: {
            shippingAddressId: shippingAddress.id,
        } satisfies IEcommerceMallOrder.ICreate,
    });
    typia.assert(order);
    TestValidator.equals("order status", order.status, "paid");
    const orderItemId = order.orderItems[0]?.id;
    if (!orderItemId) {
        throw new Error("Order has no items");
    }
    // 7. Seller creates shipment with carrier and tracking number
    const shipment = await api.functional.ecommerceMall.seller.sellers.me.orders.items.ship.create(sellerConnection, {
        itemId: orderItemId,
        body: {
            carrier: "DHL Express",
            trackingNumber: `DHL${typia.random<string>().substring(0, 10).toUpperCase()}`,
            itemIds: [orderItemId],
        } satisfies IEcommerceMallShipment.ICreate,
    });
    typia.assert(shipment);
    TestValidator.equals("shipment carrier", shipment.carrier, "DHL Express");
    // 8. Customer retrieves shipment tracking information
    const trackingInfo = await api.functional.ecommerceMall.customer.orders.shipments.at(customerConnection, {
        orderId: order.id,
        shipmentId: shipment.id,
    });
    typia.assert(trackingInfo);
    // 9. Validate shipment tracking response
    TestValidator.equals("carrier matches", trackingInfo.carrier, shipment.carrier);
    TestValidator.equals("tracking number matches", trackingInfo.trackingNumber, shipment.trackingNumber);
    TestValidator.predicate("has valid timestamps", !!trackingInfo.createdAt && !!trackingInfo.updatedAt);
    TestValidator.predicate("has shipment items", trackingInfo.shipmentItems !== undefined && trackingInfo.shipmentItems.length > 0);
    const shipmentItem = trackingInfo.shipmentItems[0];
    if (shipmentItem) {
        TestValidator.predicate("has product snapshot", !!shipmentItem.productSnapshot);
        TestValidator.predicate("has variant options", !!shipmentItem.variantOptions);
        TestValidator.equals("shipment item quantity", shipmentItem.quantity, order.orderItems[0]?.quantity);
    }
}