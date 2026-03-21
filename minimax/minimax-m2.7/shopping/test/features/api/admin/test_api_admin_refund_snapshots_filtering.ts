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
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import type { IPageIEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequestSnapshot";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_refund_snapshots_filtering(connection: api.IConnection): Promise<void> {
    // 1. Authenticate as admin
    const adminConnection: api.IConnection = { host: connection.host };
    const adminAuth = await authorize_admin_join(adminConnection, {});
    typia.assert(adminAuth);
    // 2. Authenticate as seller
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerAuth = await authorize_seller_join(sellerConnection, {});
    typia.assert(sellerAuth);
    // 3. Authenticate as customer with stored password for later use
    const customerPassword = RandomGenerator.alphaNumeric(16);
    const customerConnection: api.IConnection = { host: connection.host };
    const customerAuth = await authorize_customer_join(customerConnection, {
        body: { password: customerPassword as string & tags.Format<"password"> },
    });
    typia.assert(customerAuth);
    // 4. Create product with variant and inventory
    const product = await generate_random_ecommerce_mall_seller_products_create(sellerConnection, {
        body: {
            name: RandomGenerator.paragraph({ sentences: 1 }),
            description: RandomGenerator.paragraph({ sentences: 3 }),
            category_id: typia.random<string & tags.Format<"uuid">>(),
            base_price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
        },
    });
    typia.assert(product);
    const variant = await generate_random_ecommerce_mall_seller_seller_products_variants_create(sellerConnection, {
        params: { productId: product.id },
        body: {
            sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
            option_values: [{ key: "size", value: "Large" }],
        },
    });
    typia.assert(variant);
    const inventory = await generate_random_ecommerce_mall_seller_products_variants_inventory_create(sellerConnection, {
        params: { productId: product.id, variantId: variant.id },
        body: {
            operation: "restock" as const,
            quantity: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
            reason: "Initial stock",
        },
    });
    typia.assert(inventory);
    // 5. Create shipping address
    const address = await generate_random_ecommerce_mall_customer_customers_addresses_create(customerConnection, {
        body: {
            recipient_name: RandomGenerator.name(),
            phone: RandomGenerator.mobile(),
            street_address: "123 Test Street",
            city: "Test City",
            state: "Test State",
            postal_code: "12345",
            country: "Test Country",
            is_default: true,
        },
    });
    typia.assert(address);
    // 6. Add item to cart and place order
    const cartItem = await generate_random_ecommerce_mall_customer_cart_items_create(customerConnection, {
        body: {
            variant_id: variant.id,
            quantity: 1,
        },
    });
    typia.assert(cartItem);
    // Prepare checkout
    const prepare = await api.functional.ecommerceMall.customer.checkout.prepare(customerConnection);
    typia.assert(prepare);
    // Confirm order
    const order = await api.functional.ecommerceMall.customer.checkout.confirm.create(customerConnection, {
        body: {
            payment_token: "test_payment_token",
            address_id: address.id,
        },
    });
    typia.assert(order);
    // Get order details
    const orderDetail = await api.functional.ecommerceMall.customer.orders.at(customerConnection, {
        orderId: order.id,
    });
    typia.assert(orderDetail);
    // Get the order item ID from the first order item
    const orderItem = orderDetail.order_items[0];
    // 7. Create shipment and confirm delivery
    const shipment = await generate_random_ecommerce_mall_seller_shipments_create(sellerConnection, {
        body: {
            orderId: order.id,
            orderItemIds: [orderItem.id],
            carrier: "Test Carrier",
            trackingNumber: "TRACK123456",
        },
    });
    typia.assert(shipment);
    // Confirm delivery
    const confirmedShipment = await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(customerConnection, {
        orderId: order.id,
        shipmentId: shipment.id,
    });
    typia.assert(confirmedShipment);
    // Wait a moment for delivery timestamp to settle
    await new Promise((resolve) => setTimeout(resolve, 100));
    // 8. Create refund request and approve it (creates snapshot with approved status)
    const refundListResponse = await api.functional.ecommerceMall.customer.refund_requests.index(customerConnection, {
        body: {
            order_item_id: orderItem.id,
        },
    });
    typia.assert(refundListResponse);
    // Find pending refund request
    const pendingRefund = refundListResponse.data.find((r) => r.status === "pending");
    if (!pendingRefund) {
        throw new Error("No pending refund request found");
    }
    // Approve the refund (creates snapshot with approved status)
    const approvedRefund = await api.functional.ecommerceMall.seller.refund_requests.approve(sellerConnection, {
        requestId: pendingRefund.id,
    });
    typia.assert(approvedRefund);
    // Wait for snapshot creation
    await new Promise((resolve) => setTimeout(resolve, 200));
    // Get the timestamp from approved refund for date filtering
    const approvedTimestamp = approvedRefund.updated_at;
    // 9. Test filtering with approved status - Call PATCH /admin/refund-requests/{requestId}/snapshots
    const approvedSnapshotsPage = await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(adminConnection, {
        requestId: pendingRefund.id,
        body: {
            snapshot_status: "approved" as const,
            seller_response: "approved" as const,
            startDate: new Date(0).toISOString(),
            endDate: new Date().toISOString(),
            page: 1,
            limit: 10,
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
    });
    typia.assert(approvedSnapshotsPage);
    // Validate pagination metadata is accurate
    TestValidator.predicate("pagination exists", approvedSnapshotsPage.pagination !== null);
    TestValidator.equals("pagination current is 1", approvedSnapshotsPage.pagination.current, 1);
    TestValidator.predicate("pagination limit valid", approvedSnapshotsPage.pagination.limit === 10);
    TestValidator.predicate("pagination records valid", approvedSnapshotsPage.pagination.records >= 0);
    TestValidator.predicate("pagination pages valid", approvedSnapshotsPage.pagination.pages >= 0);
    // If we have snapshots, verify filtering works correctly
    if (approvedSnapshotsPage.data.length > 0) {
        // All returned snapshots should match the approved filter
        for (const snapshot of approvedSnapshotsPage.data) {
            TestValidator.equals("snapshot status is approved", snapshot.snapshot_status, "approved");
            TestValidator.equals("seller response is approved", snapshot.seller_response, "approved");
        }
    }
    // 10. Test filtering with rejected status (should return empty or no matches)
    const rejectedSnapshotsPage = await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(adminConnection, {
        requestId: pendingRefund.id,
        body: {
            snapshot_status: "rejected" as const,
            seller_response: "rejected" as const,
            page: 1,
            limit: 10,
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
    });
    typia.assert(rejectedSnapshotsPage);
    // Since we only approved (not rejected), should be empty or 0 records
    TestValidator.predicate("no rejected snapshots", rejectedSnapshotsPage.data.length === 0 || rejectedSnapshotsPage.pagination.records === 0);
    // 11. Test date range filtering
    const dateFilteredPage = await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(adminConnection, {
        requestId: pendingRefund.id,
        body: {
            startDate: new Date(0).toISOString(),
            endDate: approvedTimestamp,
            page: 1,
            limit: 10,
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
    });
    typia.assert(dateFilteredPage);
    // Verify date filtering includes the approved snapshot
    TestValidator.predicate("date filter includes approved snapshot", dateFilteredPage.pagination.records >= 1);
    // 12. Test pagination with limit
    const paginatedPage = await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(adminConnection, {
        requestId: pendingRefund.id,
        body: {
            page: 1,
            limit: 5,
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
    });
    typia.assert(paginatedPage);
    // Verify pagination limit
    TestValidator.equals("pagination limit is 5", paginatedPage.pagination.limit, 5);
    // Verify data count doesn't exceed limit
    TestValidator.predicate("data count does not exceed limit", paginatedPage.data.length <= 5);
}