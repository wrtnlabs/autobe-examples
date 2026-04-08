import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_cart_items_create";
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { generate_random_ecommerce_mall_customer_customers_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_checkout_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_refund_approval_rejected_for_other_seller_product(connection: api.IConnection): Promise<void> {
    // 1. Admin authentication setup
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {
        body: {
            actorType: "customer",
            requestedGrade: "admin",
            reason: "Need admin access for testing refund authorization",
            href: "https://example.com/register" as string & tags.Format<"uri">,
            referrer: "https://example.com" as string & tags.Format<"uri">,
        } satisfies IEcommerceMallAdmin.IJoin,
    });
    // 2. Create two product categories
    const categoryA = await generate_random_ecommerce_mall_admin_categories_create(adminConnection, {});
    const categoryB = await generate_random_ecommerce_mall_admin_categories_create(adminConnection, {});
    // 3. Seller A registration and approval
    const sellerACredentials = {
        email: typia.random<string & tags.Format<"email">>() as string & tags.Format<"email">,
        password: "TestPassword123!" as string & tags.Format<"password">,
    };
    const sellerAJoinConnection: api.IConnection = { host: connection.host };
    const sellerAAuth = await authorize_seller_join(sellerAJoinConnection, {
        body: {
            email: sellerACredentials.email,
            password: sellerACredentials.password,
            href: "https://example.com/register" as string & tags.Format<"uri">,
            referrer: "https://example.com" as string & tags.Format<"uri">,
        },
    });
    // 4. Seller B registration and approval
    const sellerBCredentials = {
        email: typia.random<string & tags.Format<"email">>() as string & tags.Format<"email">,
        password: "TestPassword123!" as string & tags.Format<"password">,
    };
    const sellerBJoinConnection: api.IConnection = { host: connection.host };
    const sellerBAuth = await authorize_seller_join(sellerBJoinConnection, {
        body: {
            email: sellerBCredentials.email,
            password: sellerBCredentials.password,
            href: "https://example.com/register" as string & tags.Format<"uri">,
            referrer: "https://example.com" as string & tags.Format<"uri">,
        },
    });
    // 5. Admin logs in to approve sellers
    await api.functional.ecommerceMall.auth.admin.login(adminConnection, {
        body: {
            email: "admin@test.com",
            password: "1234",
            href: "https://example.com/login",
            referrer: "https://example.com",
        } satisfies IEcommerceMallAdmin.ILogin,
    });
    // 6. Create products for both sellers
    const productA = await generate_random_ecommerce_mall_seller_products_create(sellerAJoinConnection, {
        body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 5 }),
            categoryId: categoryA.id,
            basePrice: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
        },
    });
    const productB = await generate_random_ecommerce_mall_seller_products_create(sellerBJoinConnection, {
        body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 5 }),
            categoryId: categoryB.id,
            basePrice: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
        },
    });
    // 7. Customer registration and setup
    const customerConnection: api.IConnection = { host: connection.host };
    await authorize_customer_join(customerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>() as string & tags.Format<"email">,
            password: "TestPassword123!",
            href: "https://example.com/register" as string & tags.Format<"uri">,
            referrer: "https://example.com" as string & tags.Format<"uri">,
        },
    });
    // 8. Customer adds shipping address
    const address = await generate_random_ecommerce_mall_customer_customers_addresses_create(customerConnection, {
        body: {
            recipientName: RandomGenerator.name(),
            phone: RandomGenerator.mobile(),
            streetAddress: "123 Test Street",
            city: "Test City",
            state: "Test State",
            postalCode: "12345",
            country: "Test Country",
            isDefault: true,
        },
    });
    // 9. Add both products to cart
    await generate_random_ecommerce_mall_customer_customers_cart_items_create(customerConnection, {
        body: {
            productVariantId: productA.variants[0].id,
            quantity: 1,
        },
    });
    await generate_random_ecommerce_mall_customer_customers_cart_items_create(customerConnection, {
        body: {
            productVariantId: productB.variants[0].id,
            quantity: 1,
        },
    });
    // 10. Customer checks out
    const order = await generate_random_ecommerce_mall_customer_customers_checkout_create(customerConnection, {
        body: {
            shippingAddressId: address.id,
        },
    });
    // 11. Find order items for each seller using seller IDs
    const sellerAOrderItem = order.orderItems.find((item) => item.productSnapshot.seller.id === sellerAAuth.id);
    const sellerBOrderItem = order.orderItems.find((item) => item.productSnapshot.seller.id === sellerBAuth.id);
    // 12. Both sellers ship their items
    if (sellerAOrderItem) {
        await generate_random_ecommerce_mall_seller_orders_shipments_create(sellerAJoinConnection, {
            params: { orderId: order.id },
            body: {
                orderItemIds: [sellerAOrderItem.id],
                carrier: "Test Carrier",
                trackingNumber: "TRACK123456A",
            },
        });
    }
    if (sellerBOrderItem) {
        await generate_random_ecommerce_mall_seller_orders_shipments_create(sellerBJoinConnection, {
            params: { orderId: order.id },
            body: {
                orderItemIds: [sellerBOrderItem.id],
                carrier: "Test Carrier",
                trackingNumber: "TRACK123456B",
            },
        });
    }
    // 13. Customer creates refund request for Seller A's product
    const refundRequest = await generate_random_ecommerce_mall_customer_refund_requests_create(customerConnection, {
        body: {
            orderItemId: sellerAOrderItem!.id,
            sellerId: sellerAAuth.id,
            reason: "Product not as expected",
        },
    });
    // 14. Seller B tries to approve Seller A's refund request - should fail with 403
    await TestValidator.error("Seller B cannot approve refund request for Seller A's product", async () => {
        await api.functional.ecommerceMall.seller.refund_requests.approve(sellerBJoinConnection, {
            requestId: refundRequest.id,
        });
    });
}