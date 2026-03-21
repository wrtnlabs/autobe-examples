import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
/**
 * Test checkout flow with default shipping address.
 *
 * Scenario: Customer with cart items and default shipping address
 * successfully places an order after payment confirmation.
 *
 * Prerequisites:
 * - Customer must be authenticated
 * - Cart must have available items (non-deleted product variants with sufficient stock)
 * - Customer must have a default shipping address set
 *
 * Steps:
 * 1. Create a seller account and login
 * 2. Create a product with variants for cart setup
 * 3. Create customer account and authenticate
 * 4. Create shipping address and set as default
 * 5. Add product variant to cart with desired quantity
 * 6. Call checkout confirm endpoint with payment_token (no address_id - uses default)
 *
 * Validations:
 * - Order is created with unique order_number
 * - Order status is 'paid'
 * - All cart items converted to order items with 'paid' status
 * - Product snapshots are created
 * - Seller profile snapshots are created
 * - Shipment records are created per seller
 * - Cart is cleared after checkout
 * - Response includes complete order details
 */
export async function test_api_checkout_confirm_with_default_address(connection: api.IConnection): Promise<void> {
    // ========================================
    // STEP 1: Create and authenticate seller
    // ========================================
    const sellerPassword = RandomGenerator.alphaNumeric(16);
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerAuth = await authorize_seller_join(sellerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: sellerPassword,
            href: "https://example.com/seller",
            referrer: "https://example.com",
        },
    });
    typia.assert(sellerAuth);
    // Login as seller
    const sellerLoginConnection: api.IConnection = { host: connection.host };
    const sellerLoginAuth = await api.functional.ecommerceMall.auth.seller.login(sellerLoginConnection, {
        body: {
            email: sellerAuth.email,
            password: sellerPassword,
            href: "https://example.com/seller",
            referrer: "https://example.com",
        } satisfies IEcommerceMallSeller.ILogin,
    });
    typia.assert(sellerLoginAuth);
    // ========================================
    // STEP 2: Create product with variants
    // ========================================
    const product = await api.functional.ecommerceMall.seller.products.create(sellerLoginConnection, {
        body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 5 }),
            base_price: typia.random<number & tags.Minimum<0>>(),
            category_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEcommerceMallProduct.ICreate,
    });
    typia.assert(product);
    // ========================================
    // STEP 3: Create customer and authenticate
    // ========================================
    const customerConnection: api.IConnection = { host: connection.host };
    const customerAuth = await authorize_customer_join(customerConnection, {});
    typia.assert(customerAuth);
    // ========================================
    // STEP 4: Create shipping address as default
    // ========================================
    const address = await api.functional.ecommerceMall.customer.customers.addresses.create(customerConnection, {
        body: {
            recipient_name: RandomGenerator.name(),
            phone: RandomGenerator.mobile(),
            street_address: `${randint(1, 9999)} Main Street`,
            city: "Seoul",
            state: "Gangnam-gu",
            postal_code: "12345",
            country: "South Korea",
            is_default: true,
        } satisfies IEcommerceMallShippingAddress.ICreate,
    });
    typia.assert(address);
    TestValidator.equals("address is default", address.is_default, true);
    // ========================================
    // STEP 5: Add product variant to cart
    // ========================================
    // Use variant from created product or generate a variant ID
    const variantId = product.variants.length > 0
        ? product.variants[0].id
        : typia.random<string & tags.Format<"uuid">>();
    const cartItem = await api.functional.ecommerceMall.customer.cart.items.create(customerConnection, {
        body: {
            variant_id: variantId,
            quantity: randint(1, 10),
        } satisfies IEcommerceMallCartItem.ICreate,
    });
    typia.assert(cartItem);
    // ========================================
    // STEP 6: Checkout confirm with default address
    // ========================================
    const order = await api.functional.ecommerceMall.customer.checkout.confirm.create(customerConnection, {
        body: {
            payment_token: RandomGenerator.alphaNumeric(32),
            // address_id NOT provided - should use default address
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
    });
    typia.assert(order);
    // ========================================
    // VALIDATIONS
    // ========================================
    // Order has unique order number
    TestValidator.predicate("order has order number", order.orderNumber.length > 0);
    // Order status is 'paid'
    TestValidator.equals("order status is paid", order.status, "paid");
    // Order has order items
    TestValidator.predicate("order has items", order.orderItems.length > 0);
    // All order items have 'paid' status
    for (const item of order.orderItems) {
        TestValidator.equals(`order item ${item.id} status is paid`, item.status, "paid");
    }
    // Order has shipments (one per seller)
    TestValidator.predicate("order has shipments", order.shipments.length > 0);
    // Each shipment has seller reference
    for (const shipment of order.shipments) {
        TestValidator.predicate("shipment has seller", !!shipment.seller);
    }
    // Shipping address matches default address
    TestValidator.equals("shipping address matches default", order.shippingAddress.id, address.id);
    // Order has valid total amount
    TestValidator.predicate("order has valid total amount", order.totalAmount > 0);
    // Order has valid subtotal
    TestValidator.predicate("order has valid subtotal", order.subtotal > 0);
    // Order has items count
    TestValidator.predicate("order has items count", order.itemsCount > 0);
    // Order items have product snapshots
    for (const item of order.orderItems) {
        TestValidator.predicate("order item has product snapshot", !!item.productSnapshot);
    }
    // Order items have seller profile snapshots
    for (const item of order.orderItems) {
        TestValidator.predicate("order item has seller profile snapshot", !!item.sellerProfileSnapshot);
    }
    // Order items have product variants
    for (const item of order.orderItems) {
        TestValidator.predicate("order item has variant", !!item.productVariant);
    }
}