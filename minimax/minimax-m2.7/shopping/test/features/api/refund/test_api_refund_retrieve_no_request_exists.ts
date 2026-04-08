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
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_variants_create";
import { generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add";
import { generate_random_ecommerce_mall_customer_customers_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_cart_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
/**
 * Test retrieving refund request when no refund request has been submitted for the order item.
 *
 * Validates that attempting to retrieve a refund request for an order item that has no associated
 * refund request returns a 404 Not Found error. This test ensures the system correctly handles
 * non-existent resource retrieval scenarios and provides appropriate error messaging.
 *
 * The test flow involves:
 * 1. Customer registers and authenticates
 * 2. Seller registers, logs in, and creates a product with variant and inventory
 * 3. Customer adds product to cart and creates an order
 * 4. Customer attempts to retrieve refund request for an order item without any refund request
 * 5. System returns 404 error indicating no refund request exists
 *
 * This validates the refund retrieval endpoint's behavior when no refund request has been created,
 * ensuring proper error handling and meaningful error messages for missing resources.
 */
export async function test_api_refund_retrieve_no_request_exists(connection: api.IConnection): Promise<void> {
    // 1. Customer registration and authentication
    const customerConnection: api.IConnection = { host: connection.host };
    await authorize_customer_join(customerConnection, {});
    // 2. Seller registration (includes authentication)
    const sellerConnection: api.IConnection = { host: connection.host };
    await authorize_seller_join(sellerConnection, {});
    // 3. Seller creates a product
    const product = await api.functional.ecommerceMall.seller.sellers.me.products.create(sellerConnection, {
        body: {
            name: "Test Product",
            description: "A test product for refund retrieval testing",
            basePrice: 10000,
            categoryId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEcommerceMallProduct.ICreate,
    });
    typia.assert(product);
    // 4. Seller creates a product variant
    const variant = await api.functional.ecommerceMall.seller.sellers.me.products.variants.create(sellerConnection, {
        productId: product.id,
        body: {
            skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
            price: 10000,
            optionValues: [
                { key: "Color", value: "Blue" },
            ],
        } satisfies IEcommerceMallProductVariant.ICreate,
    });
    typia.assert(variant);
    // 5. Seller adds inventory
    await api.functional.ecommerceMall.seller.sellers.me.variants._inventory.add(sellerConnection, {
        variantId: variant.id,
        body: {
            quantityChange: 100,
            reason: "Initial stock",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
    });
    // 6. Customer adds product to cart
    await api.functional.ecommerceMall.customer.customers.me.cart.create(customerConnection, {
        body: {
            variantId: variant.id,
            quantity: 1,
        } satisfies IEcommerceMallCart.ICreate,
    });
    // 7. Customer creates an order
    // Note: The system should handle missing shipping address gracefully or use a default
    const order = await api.functional.ecommerceMall.customer.customers.me.orders.create(customerConnection, {
        body: {
            shippingAddressId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEcommerceMallOrder.ICreate,
    });
    typia.assert(order);
    // 8. Get the first order item ID
    const orderItemId = order.orderItems[0]?.id;
    if (orderItemId === undefined) {
        throw new Error("Order item not found");
    }
    // 9. Attempt to retrieve refund request for order item without refund request
    // This should return 404 error because no refund request exists
    await TestValidator.error("no refund request exists for order item", async () => {
        await api.functional.ecommerceMall.customer.customers.me.orders.items.refund.at(customerConnection, {
            itemId: orderItemId,
        });
    });
}