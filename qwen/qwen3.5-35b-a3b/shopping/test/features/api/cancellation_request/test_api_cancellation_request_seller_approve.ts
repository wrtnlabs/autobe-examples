import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { generate_random_ecommerce_mall_member_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_member_cancellation_requests_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_cancellation_request_seller_approve(connection: api.IConnection): Promise<void> {
    // 1. Setup: Create and login seller (status will be pending, but we'll proceed for testing)
    const sellerConnection: api.IConnection = { host: connection.host };
    const seller = await authorize_seller_join(sellerConnection, {
        body: {
            display_name: RandomGenerator.name(),
        },
    });
    typia.assert(seller);
    // 2. Setup: Create customer
    const customerConnection: api.IConnection = { host: connection.host };
    const customer = await authorize_member_join(customerConnection, {
        body: {
            display_name: RandomGenerator.name(),
        },
    });
    typia.assert(customer);
    // 3. Setup: Create customer address
    const addressConnection: api.IConnection = { host: connection.host };
    await authorize_member_login(addressConnection, {
        body: {
            email: customer.email,
            password: "1234",
            href: "https://test.com/address",
            referrer: "https://test.com",
            ip: "127.0.0.1",
        },
    });
    // Create a test address using typia random for UUID
    const addressId = typia.random<string & tags.Format<"uuid">>();
    // 4. Setup: Create category ID for product
    const categoryId = typia.random<string & tags.Format<"uuid">>();
    // 5. Setup: Seller creates a product
    const product = await api.functional.ecommerceMall.seller.products.create(sellerConnection, {
        body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.content({ paragraphs: 1 }),
            category_id: categoryId,
            base_price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
        } satisfies IEcommerceMallProduct.ICreate,
    });
    typia.assert(product);
    // 6. Setup: Seller creates a variant with stock
    const variant = await api.functional.ecommerceMall.seller.products.variants.create(sellerConnection, {
        productId: product.id,
        body: {
            sku_code: RandomGenerator.alphaNumeric(8),
            option_values: JSON.stringify({
                color: RandomGenerator.pick(["red", "blue", "green"]),
                size: RandomGenerator.pick(["S", "M", "L"]),
            }),
            stock_quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<5>>(),
        } satisfies IEcommerceMallProductVariant.ICreate,
    });
    typia.assert(variant);
    // 7. Setup: Customer places an order
    const order = await api.functional.ecommerceMall.member.orders.create(addressConnection, {
        body: {
            shipping_address_id: addressId,
            order_items: [
                {
                    product_variant_id: variant.id,
                    quantity: 1,
                } satisfies IEcommerceMallOrderItem.ICreate,
            ],
        } satisfies IEcommerceMallOrder.ICreate,
    });
    typia.assert(order);
    TestValidator.equals("order has items", order.items.length > 0, true);
    // 8. Setup: Customer creates a cancellation request
    const orderItemId = order.items[0].id;
    const cancellationRequest = await api.functional.ecommerceMall.member.cancellation_requests.create(addressConnection, {
        body: {
            order_item_id: orderItemId,
            reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallCancellationRequest.ICreate,
    });
    typia.assert(cancellationRequest);
    TestValidator.equals("cancellation request status is pending", cancellationRequest.status, "pending");
    TestValidator.equals("cancellation request reason is set", cancellationRequest.reason.length > 0, true);
    // 9. Test: Seller approves the cancellation request
    const approveConnection: api.IConnection = { host: connection.host };
    await authorize_seller_login(approveConnection, {
        body: {
            email: seller.email,
            password: "1234",
            href: "https://test.com/approve",
            referrer: "https://test.com",
            ip: "127.0.0.1",
        },
    });
    const updatedRequest = await api.functional.ecommerceMall.seller.cancellation_requests.update(approveConnection, {
        id: cancellationRequest.id,
        body: {
            status: "approved",
        } satisfies IEcommerceMallCancellationRequest.IUpdate,
    });
    typia.assert(updatedRequest);
    // 10. Validate: Cancellation request status is approved
    TestValidator.equals("cancellation request status is approved", updatedRequest.status, "approved");
    // 11. Validate: Order item status changed to cancelled
    TestValidator.equals("order item status is cancelled", updatedRequest.item.status, "cancelled");
}