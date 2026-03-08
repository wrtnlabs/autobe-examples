import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
export async function test_api_refund_request_search_by_reason(connection: api.IConnection): Promise<void> {
    // 1. Administrator creates a category
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_administrator_join(adminConnection, {});
    const category = await generate_random_shopping_mall_administrator_categories_create(adminConnection, {});
    typia.assert(category);
    // 2. Seller joins and logs in, creates product with variant and adds inventory
    const sellerConnection: api.IConnection = { host: connection.host };
    await authorize_seller_join(sellerConnection, {});
    const product = await generate_random_shopping_mall_seller_products_create(sellerConnection, { body: { categoryId: category.id } });
    typia.assert(product);
    const variant = await generate_random_shopping_mall_seller_products_variants_create(sellerConnection, { params: { productId: product.id } });
    typia.assert(variant);
    await generate_random_shopping_mall_seller_variants_inventory_records_create(sellerConnection, {
        params: { variantId: variant.id },
        body: { quantity_change: 100, reason: "Initial stock" },
    });
    // 3. Customer joins, logs in, creates address, adds to cart, checks out
    const customerConnection: api.IConnection = { host: connection.host };
    await authorize_customer_join(customerConnection, {});
    const address = await generate_random_shopping_mall_customer_addresses_create(customerConnection, {});
    typia.assert(address);
    await generate_random_shopping_mall_customer_cart_items_create(customerConnection, { body: { variant_id: variant.id, quantity: 1 } });
    const order = await generate_random_shopping_mall_customer_checkout_create(customerConnection, { body: { address_id: address.id } });
    typia.assert(order);
    // 4. Create shipment - need order_item_ids (using order.id as we can't get individual order items)
    const shipment = await generate_random_shopping_mall_seller_shipments_create(sellerConnection, {
        body: {
            order_id: order.id,
            order_item_ids: [typia.random<string & tags.Format<"uuid">>()],
            carrier_name: "FedEx",
            tracking_number: "TRACK123456",
        },
    });
    typia.assert(shipment);
    // Get the order item ID from the shipment response
    const orderItemId = shipment.orderItems[0]?.id;
    if (!orderItemId)
        throw new Error("No order items found in shipment");
    // 5. Customer confirms delivery
    await api.functional.shoppingMall.customer.shipments.delivery.confirmDelivery(customerConnection, { shipmentId: shipment.id });
    // 6. Create first refund request with reason containing "damaged"
    const refundRequest1 = await generate_random_shopping_mall_customer_refund_requests_create(customerConnection, { body: { orderItemId, reason: "Product arrived damaged during shipping" } });
    typia.assert(refundRequest1);
    // Create second product and order for second refund request
    const product2 = await generate_random_shopping_mall_seller_products_create(sellerConnection, { body: { categoryId: category.id } });
    typia.assert(product2);
    const variant2 = await generate_random_shopping_mall_seller_products_variants_create(sellerConnection, { params: { productId: product2.id } });
    typia.assert(variant2);
    await generate_random_shopping_mall_seller_variants_inventory_records_create(sellerConnection, {
        params: { variantId: variant2.id },
        body: { quantity_change: 100, reason: "Initial stock" },
    });
    await generate_random_shopping_mall_customer_cart_items_create(customerConnection, { body: { variant_id: variant2.id, quantity: 1 } });
    const order2 = await generate_random_shopping_mall_customer_checkout_create(customerConnection, { body: { address_id: address.id } });
    typia.assert(order2);
    const shipment2 = await generate_random_shopping_mall_seller_shipments_create(sellerConnection, {
        body: {
            order_id: order2.id,
            order_item_ids: [typia.random<string & tags.Format<"uuid">>()],
            carrier_name: "UPS",
            tracking_number: "TRACK789012",
        },
    });
    typia.assert(shipment2);
    const orderItemId2 = shipment2.orderItems[0]?.id;
    if (!orderItemId2)
        throw new Error("No order items found in shipment");
    await api.functional.shoppingMall.customer.shipments.delivery.confirmDelivery(customerConnection, { shipmentId: shipment2.id });
    const refundRequest2 = await generate_random_shopping_mall_customer_refund_requests_create(customerConnection, { body: { orderItemId: orderItemId2, reason: "Item does not match description" } });
    typia.assert(refundRequest2);
    // Test 1: Search for unique word "damaged" - should find only first refund request
    const searchDamaged = await api.functional.shoppingMall.customer.refund_requests.index(customerConnection, { body: { search: "damaged" } });
    typia.assert(searchDamaged);
    TestValidator.predicate("search 'damaged' returns at least one result", searchDamaged.data.length >= 1);
    TestValidator.predicate("search 'damaged' results contain 'damaged' in reason", searchDamaged.data.every((r) => r.reason.toLowerCase().includes("damaged")));
    // Test 2: Search for common word appearing in multiple requests
    const searchMatch = await api.functional.shoppingMall.customer.refund_requests.index(customerConnection, { body: { search: "match" } });
    typia.assert(searchMatch);
    TestValidator.predicate("search 'match' returns at least one result", searchMatch.data.length >= 1);
    TestValidator.predicate("search 'match' results contain 'match' in reason", searchMatch.data.every((r) => r.reason.toLowerCase().includes("match")));
    // Test 3: Search for non-existent word - should return empty
    const searchNonExistent = await api.functional.shoppingMall.customer.refund_requests.index(customerConnection, { body: { search: "nonexistentword12345xyz" } });
    typia.assert(searchNonExistent);
    TestValidator.equals("search non-existent returns empty", searchNonExistent.data.length, 0);
    // Test 4: Combine search with status filter
    const searchPending = await api.functional.shoppingMall.customer.refund_requests.index(customerConnection, { body: { search: "damaged", status: "pending" } });
    typia.assert(searchPending);
    TestValidator.predicate("search with status filter returns results", searchPending.data.length >= 1);
    TestValidator.predicate("all results have pending status", searchPending.data.every((r) => r.status === "pending"));
    TestValidator.predicate("all results contain search term in reason", searchPending.data.every((r) => r.reason.toLowerCase().includes("damaged")));
    // Test 5: Case-insensitive search - uppercase
    const searchUppercase = await api.functional.shoppingMall.customer.refund_requests.index(customerConnection, { body: { search: "DAMAGED" } });
    typia.assert(searchUppercase);
    TestValidator.predicate("uppercase search returns results", searchUppercase.data.length >= 1);
    TestValidator.equals("case-insensitive search matches", searchDamaged.data.length, searchUppercase.data.length);
    // Test 6: Case-insensitive search - mixed case
    const searchMixedCase = await api.functional.shoppingMall.customer.refund_requests.index(customerConnection, { body: { search: "Damaged" } });
    typia.assert(searchMixedCase);
    TestValidator.predicate("mixed case search returns results", searchMixedCase.data.length >= 1);
    TestValidator.equals("mixed case matches lowercase", searchDamaged.data.length, searchMixedCase.data.length);
}