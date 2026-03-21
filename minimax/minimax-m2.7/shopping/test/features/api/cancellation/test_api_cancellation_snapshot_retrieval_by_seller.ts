import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCheckoutPrepareItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutPrepareItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_cancellation_snapshot_retrieval_by_seller(connection: api.IConnection): Promise<void> {
    // STEP 1: Seller Registration and Authentication
    const sellerEmail = `seller_${typia.random<string & tags.Format<"email">>()}`;
    const sellerPassword = "TestPassword123!";
    const sellerAuthResult = await authorize_seller_join(connection, {
        body: {
            email: sellerEmail,
            password: sellerPassword,
            href: "https://test.com/seller/register",
            referrer: "https://test.com",
        },
    });
    typia.assert(sellerAuthResult);
    const sellerConnection: api.IConnection = { host: connection.host };
    await authorize_seller_login(sellerConnection, {
        body: {
            email: sellerEmail,
            password: sellerPassword,
            href: "https://test.com/seller/login",
            referrer: "https://test.com",
        },
    });
    // STEP 2: Create Product with Variant
    const product = await generate_random_ecommerce_mall_seller_products_create(sellerConnection, {});
    typia.assert(product);
    const variant = product.variants[0];
    TestValidator.equals("product has variants", product.variants.length > 0, true);
    // STEP 3: Add Inventory to Product Variant
    const inventoryRecord = await generate_random_ecommerce_mall_seller_products_variants_inventory_create(sellerConnection, {
        params: {
            productId: product.id,
            variantId: variant.id,
        },
        body: {
            operation: "restock",
            quantity: 10,
            reason: "Initial stock for E2E test",
        },
    });
    typia.assert(inventoryRecord);
    // STEP 4: Customer Registration and Authentication
    const customerEmail = `customer_${typia.random<string & tags.Format<"email">>()}`;
    const customerPassword = "TestPassword123!";
    const customerAuthResult = await authorize_customer_join(connection, {
        body: {
            email: customerEmail,
            password: customerPassword,
            href: "https://test.com/customer/register",
            referrer: "https://test.com",
        },
    });
    typia.assert(customerAuthResult);
    const customerConnection: api.IConnection = { host: connection.host };
    await authorize_customer_login(customerConnection, {
        body: {
            email: customerEmail,
            password: customerPassword,
            href: "https://test.com/customer/login",
            referrer: "https://test.com",
        },
    });
    // STEP 5: Customer Adds Product to Cart
    const cartItem = await generate_random_ecommerce_mall_customer_cart_items_create(customerConnection, {
        body: {
            variant_id: variant.id,
            quantity: 2,
        },
    });
    typia.assert(cartItem);
    TestValidator.equals("cart item variant matches", cartItem.product_variant.id, variant.id);
    // STEP 6: Customer Prepares and Confirms Checkout
    const checkoutPrepare = await api.functional.ecommerceMall.customer.checkout.prepare(customerConnection);
    typia.assert(checkoutPrepare);
    TestValidator.equals("checkout has available items", checkoutPrepare.validatedItems.length > 0, true);
    const order = await api.functional.ecommerceMall.customer.checkout.confirm.create(customerConnection, {
        body: {
            payment_token: `mock_payment_token_${typia.random<string & tags.Format<"uuid">>()}`,
        },
    });
    typia.assert(order);
    TestValidator.equals("order has items", order.orderItems.length > 0, true);
    const orderItem = order.orderItems[0];
    // STEP 7: Seller Creates Shipment
    const shipment = await generate_random_ecommerce_mall_seller_shipments_create(sellerConnection, {
        body: {
            orderId: order.id,
            orderItemIds: [orderItem.id],
            carrier: "TestCarrier",
            trackingNumber: "TRACK12345678",
        },
    });
    typia.assert(shipment);
    TestValidator.equals("shipment has items", shipment.shipment_items.length > 0, true);
    // STEP 8: Customer Confirms Delivery
    const confirmedShipment = await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(customerConnection, {
        orderId: order.id,
        shipmentId: shipment.id,
    });
    typia.assert(confirmedShipment);
    const deliveredOrderItem = confirmedShipment.shipment_items[0].orderItem;
    TestValidator.equals("order item status is delivered", deliveredOrderItem.status, "delivered");
    // STEP 9: Customer Requests Cancellation
    // Query cancellation requests for this customer
    const cancellationListResponse = await api.functional.ecommerceMall.customer.cancellation_requests.index(customerConnection, {
        body: {
            page: 1,
            limit: 100,
        },
    });
    typia.assert(cancellationListResponse);
    // Find cancellation request for the delivered order item
    const cancellationRequest = cancellationListResponse.data.find(req => req.orderItem.id === orderItem.id);
    TestValidator.equals("cancellation request exists for delivered item", cancellationRequest !== undefined, true);
    // Use typia.assertGuard with ! to narrow the type
    typia.assertGuard(cancellationRequest!);
    const cancellationRequestId: string & tags.Format<"uuid"> = cancellationRequest.id;
    // STEP 10: Seller Approves Cancellation (Creates Snapshot)
    const approvedCancellation = await api.functional.ecommerceMall.seller.cancellation_requests.approve(sellerConnection, {
        requestId: cancellationRequestId,
    });
    typia.assert(approvedCancellation);
    TestValidator.equals("cancellation status is approved", approvedCancellation.status, "approved");
    // Get the snapshot ID from the approved cancellation response
    TestValidator.equals("cancellation has snapshots", approvedCancellation.snapshots.length > 0, true);
    const snapshotId = approvedCancellation.snapshots[0].id;
    // STEP 11: Seller Retrieves the Snapshot
    const snapshot = await api.functional.ecommerceMall.seller.cancellation_requests.snapshots.at(sellerConnection, {
        requestId: cancellationRequestId,
        snapshotId: snapshotId,
    });
    typia.assert(snapshot);
    // STEP 12: Validate Snapshot Contents
    TestValidator.equals("snapshot id matches", snapshot.id, snapshotId);
    TestValidator.equals("snapshot has reason", typeof snapshot.reason === "string", true);
    TestValidator.equals("snapshot status is approved", snapshot.status, "approved");
    TestValidator.equals("snapshot has created_at", typeof snapshot.created_at === "string", true);
    // Validate parent cancellation_request object
    TestValidator.equals("cancellation_request exists", snapshot.cancellation_request !== null, true);
    TestValidator.equals("cancellation_request has customer", snapshot.cancellation_request.customer !== null, true);
    TestValidator.equals("cancellation_request has orderItem", snapshot.cancellation_request.orderItem !== null, true);
    TestValidator.equals("cancellation_request status is approved", snapshot.cancellation_request.status, "approved");
    // Validate customer context
    TestValidator.equals("customer email is valid", typeof snapshot.cancellation_request.customer.email === "string", true);
    TestValidator.equals("customer has id", snapshot.cancellation_request.customer.id !== null, true);
    // Validate orderItem context
    TestValidator.equals("orderItem has id", snapshot.cancellation_request.orderItem.id !== null, true);
    TestValidator.equals("orderItem has productSnapshot", snapshot.cancellation_request.orderItem.productSnapshot !== null, true);
    TestValidator.equals("orderItem has sellerProfileSnapshot", snapshot.cancellation_request.orderItem.sellerProfileSnapshot !== null, true);
}