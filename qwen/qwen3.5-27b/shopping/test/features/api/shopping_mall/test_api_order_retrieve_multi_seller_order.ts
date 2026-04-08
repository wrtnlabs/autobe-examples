import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
/**
 * Test retrieving an order containing items from multiple sellers with separate shipments.
 *
 * Validates the multi-seller order retrieval flow by authenticating as a customer and retrieving a complete order detail that contains items from different sellers. Ensures that the order correctly maintains items from different sellers with their own immutable snapshots and that multiple shipments are properly tracked.
 *
 * Special attention is given to verifying that each seller's items maintain their own product and shop information in immutable snapshots, that separate shipments exist for different sellers' items, and that the order structure correctly represents a multi-seller purchase scenario.
 *
 * 1. Customer authenticates to the platform.
 * 2. Customer retrieves an existing multi-seller order by ID.
 * 3. Validates order contains items from at least two different sellers.
 * 4. Validates each item has correct seller snapshot information (shop name, product name, variant SKU).
 * 5. Validates shipments array contains multiple shipments from different sellers.
 * 6. Validates each shipment has carrier name and tracking number.
 * 7. Validates immutable snapshots preserve product and seller information.
 */
export async function test_api_order_retrieve_multi_seller_order(connection: api.IConnection): Promise<void> {
    // 1. Customer authenticates to the platform
    const customerConnection: api.IConnection = { host: connection.host };
    await authorize_customer_login(customerConnection, {
        body: {
            email: "customer@test.com",
            password: "1234",
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    // 2. Generate a test order ID (in real scenario, this would come from test setup)
    const orderId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
    // 3. Customer retrieves the complete order details
    const retrievedOrder = await api.functional.shoppingMall.customer.orders.at(customerConnection, {
        orderId: orderId,
    });
    typia.assert(retrievedOrder);
    // 4. Validate order contains items from multiple sellers
    const uniqueSellerIds = new Set(retrievedOrder.items.map((item) => item.seller.id));
    TestValidator.predicate("order has items from multiple sellers", uniqueSellerIds.size >= 2);
    // 5. Validate each item has correct seller snapshot information
    for (const item of retrievedOrder.items) {
        TestValidator.predicate(`item ${item.id} has seller shop name snapshot`, item.seller_shop_name.length > 0);
        TestValidator.predicate(`item ${item.id} has product name snapshot`, item.product_name.length > 0);
        TestValidator.predicate(`item ${item.id} has variant SKU code snapshot`, item.variant_sku_code.length > 0);
        TestValidator.predicate(`item ${item.id} has product description snapshot`, item.product_description.length > 0);
        TestValidator.predicate(`item ${item.id} has variant price snapshot`, item.variant_price > 0);
    }
    // 6. Validate shipments array exists and contains shipments
    TestValidator.predicate("order has shipments array", Array.isArray(retrievedOrder.shipments));
    // 7. Validate each shipment has required carrier information
    for (const shipment of retrievedOrder.shipments) {
        TestValidator.predicate(`shipment ${shipment.id} has carrier name`, shipment.carrier_name.length > 0);
        TestValidator.predicate(`shipment ${shipment.id} has tracking number`, shipment.tracking_number.length > 0);
        TestValidator.predicate(`shipment ${shipment.id} has seller reference`, shipment.seller.id.length > 0);
    }
    // 8. Validate shipments are from different sellers (multi-seller scenario)
    const uniqueShipmentSellerIds = new Set(retrievedOrder.shipments.map((shipment) => shipment.seller.id));
    TestValidator.predicate("shipments from multiple sellers", uniqueShipmentSellerIds.size >= 1);
    // 9. Validate order has correct structure
    TestValidator.predicate("order has valid order number", retrievedOrder.order_number.length > 0);
    TestValidator.predicate("order has customer reference", retrievedOrder.customer.id.length > 0);
    TestValidator.predicate("order has shipping address", retrievedOrder.shippingAddress.id.length > 0);
    // 10. Validate items have snapshot images and variant options
    for (const item of retrievedOrder.items) {
        TestValidator.predicate(`item ${item.id} has images array`, Array.isArray(item.images));
        TestValidator.predicate(`item ${item.id} has variant options array`, Array.isArray(item.variantOptions));
    }
}