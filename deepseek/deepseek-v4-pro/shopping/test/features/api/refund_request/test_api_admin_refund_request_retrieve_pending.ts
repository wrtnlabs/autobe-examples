import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import type { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import type { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
import type { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_order_items_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_refund_requests_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_refund_request_retrieve_pending(connection: api.IConnection): Promise<void>
{
    // 1. Admin setup
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {});
    // 2. Seller registration
    const sellerConnection: api.IConnection = { host: connection.host };
    const seller = await authorize_seller_join(sellerConnection, {});
    // 3. Admin approves the seller
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
        sellerId: seller.id,
    });
    // 4. Admin creates a product category
    const category = await generate_random_shopping_mall_admin_categories_create(adminConnection, {});
    // 5. Seller creates a product
    const product = await generate_random_shopping_mall_seller_products_create(sellerConnection, {
        body: {
            shopping_mall_category_id: category.id,
        },
    });
    // 6. Seller creates a purchasable variant with stock
    const variant = await generate_random_shopping_mall_seller_products_variants_create(sellerConnection, {
        params: { productId: product.id },
        body: {
            initialStockQuantity: 100,
        },
    });
    // 7. Seller adds inventory stock
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(sellerConnection, {
        params: {
            productId: product.id,
            variantId: variant.id,
        },
    });
    // 8. Customer registration
    const customerConnection: api.IConnection = { host: connection.host };
    await authorize_customer_join(customerConnection, {});
    // 9. Customer places an order for the variant
    const order = await generate_random_shopping_mall_customer_orders_create(customerConnection, {
        body: {
            items: [
                {
                    variant_id: variant.id,
                    quantity: 1,
                },
            ],
        },
    });
    typia.assert(order);
    const orderItem = order.items[0];
    typia.assert(orderItem);
    // 10. Customer submits a refund request for the delivered order item
    const refundRequest = await generate_random_shopping_mall_customer_order_items_refund_requests_create(customerConnection, {
        params: { itemId: orderItem.id },
    });
    typia.assert(refundRequest);
    // 11. Admin retrieves the refund request by its UUID
    const retrieved = await api.functional.shoppingMall.admin.refund_requests.at(adminConnection, {
        requestId: refundRequest.id,
    });
    typia.assert(retrieved);
    // 12. Validate core response fields
    TestValidator.equals("refund request id matches", retrieved.id, refundRequest.id);
    TestValidator.equals("status is pending", retrieved.status, "pending");
    TestValidator.equals("responded_at is null", retrieved.responded_at, null);
    TestValidator.equals("reason matches original", retrieved.reason, refundRequest.reason);
    TestValidator.equals("deleted_at is null", retrieved.deleted_at, null);
    TestValidator.predicate("orderItem is present", retrieved.orderItem !== null);
    TestValidator.equals("orderItem id matches", retrieved.orderItem.id, orderItem.id);
}
