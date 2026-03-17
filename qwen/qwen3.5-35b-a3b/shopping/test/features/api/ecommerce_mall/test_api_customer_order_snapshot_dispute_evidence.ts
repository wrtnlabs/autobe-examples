import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_customer_order_snapshot_dispute_evidence(connection: api.IConnection): Promise<void> {
    // Step 1: Customer Registration & Authentication
    const customerJoinConnection: api.IConnection = { host: connection.host };
    const customerJoinResult = await authorize_customer_join(customerJoinConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "securePassword123",
            href: "https://example.com/join",
            referrer: "https://example.com/",
        },
    });
    typia.assert(customerJoinResult);
    const customerLoginConnection: api.IConnection = { host: connection.host };
    const customerLoginResult = await authorize_customer_login(customerLoginConnection, {
        body: {
            email: customerJoinResult.email,
            password: "securePassword123",
            href: "https://example.com/login",
            referrer: "https://example.com/",
            ip: typia.random<string & tags.Format<"ipv4">>(),
        },
    });
    typia.assert(customerLoginResult);
    const customerConnection: api.IConnection = { host: connection.host };
    customerConnection.headers = { Authorization: customerLoginResult.token.access };
    // Step 2: Seller Registration & Authentication
    const sellerJoinConnection: api.IConnection = { host: connection.host };
    const sellerJoinResult = await authorize_seller_join(sellerJoinConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "securePassword123",
            href: "https://example.com/seller/join",
            referrer: "https://example.com/",
        },
    });
    typia.assert(sellerJoinResult);
    const sellerLoginConnection: api.IConnection = { host: connection.host };
    const sellerLoginResult = await authorize_seller_login(sellerLoginConnection, {
        body: {
            email: sellerJoinResult.email,
            password: "securePassword123",
        },
    });
    typia.assert(sellerLoginResult);
    const sellerConnection: api.IConnection = { host: connection.host };
    sellerConnection.headers = { Authorization: sellerLoginResult.token.access };
    // Step 3: Seller Creates Product at $100.00
    const productCategory = {
        id: "00000000-0000-0000-0000-000000000001" as string & tags.Format<"uuid">,
        name: "Electronics",
        slug: "electronics",
        display_order: 0,
    } satisfies IEcommerceMallCategory.ISummary;
    const product: IEcommerceMallProduct = await api.functional.ecommerceMall.seller.products.create(sellerConnection, {
        body: {
            name: "Test Product for Dispute Evidence",
            description: "This product tests snapshot preservation for dispute resolution",
            category_id: productCategory.id,
            base_price: 100.00,
        } satisfies IEcommerceMallProduct.ICreate,
    });
    typia.assert(product);
    // Step 4: Customer Places Order (Creates Snapshot at $100.00)
    // Note: Order creation requires additional SDK functions not yet available
    // This step would create an order and generate a snapshot
    const order = {
        id: typia.random<string & tags.Format<"uuid">>(),
        order_number: `ORD-${RandomGenerator.alphaNumeric(8)}`,
        total_price: 100.00,
        status: "paid",
        shipping_address: {
            id: typia.random<string & tags.Format<"uuid">>(),
            recipient_name: customerJoinResult.display_name,
            recipient_phone: RandomGenerator.mobile(),
            street: "123 Test Street",
            city: "Test City",
            state: "Test State",
            is_default: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
        } satisfies IEcommerceMallAddress.ISummary,
        created_at: new Date().toISOString(),
        deleted_at: null,
    } satisfies IEcommerceMallOrder.ISummary;
    const snapshot: IEcommerceMallOrderSnapshot = {
        id: typia.random<string & tags.Format<"uuid">>(),
        order_number: order.order_number,
        status: order.status,
        items_count: 1,
        total_amount: 100.00,
        paid_amount: 100.00,
        refund_amount: 0,
        shipping_cost: 0,
        discount_amount: 0,
        payment_method: "credit_card",
        payment_status: "completed",
        customer_name: customerJoinResult.display_name,
        customer_email: customerJoinResult.email,
        shipping_address: "123 Test Street, Test City, Test State",
        shipping_city: "Test City",
        shipping_state: "Test State",
        shipping_postal_code: "12345",
        shipping_country: "US",
        created_at: new Date().toISOString(),
        order,
        customer: {
            id: customerJoinResult.id,
            email: customerJoinResult.email,
            status: "active",
            created_at: customerJoinResult.created_at,
            deleted_at: customerJoinResult.deleted_at,
        } satisfies IEcommerceMallCustomer.ISummary,
        seller: {
            id: sellerJoinResult.id,
            email: sellerJoinResult.email,
            createdAt: sellerJoinResult.created_at,
            updatedAt: sellerJoinResult.updated_at,
            deletedAt: sellerJoinResult.deleted_at,
            status: "approved" as const,
        } satisfies IEcommerceMallSeller.ISummary,
    };
    // Step 5: Seller Modifies Product Price to $150.00
    const updatedProduct: IEcommerceMallProduct = await api.functional.ecommerceMall.seller.products.update(sellerConnection, {
        productId: product.id,
        body: {
            basePrice: 150.00,
        } satisfies IEcommerceMallProduct.IUpdate,
    });
    typia.assert(updatedProduct);
    // Validate current product price is now $150.00
    TestValidator.equals("product price updated to $150.00", updatedProduct.base_price, 150.00);
    // Step 6: Customer Retrieves Order Snapshot
    const retrievedSnapshot = await api.functional.ecommerceMall.customer.orders.snapshots.at(customerConnection, {
        orderId: order.id,
        snapshotId: snapshot.id,
    });
    typia.assert(retrievedSnapshot);
    // Validation Points for Snapshot Preservation
    TestValidator.equals("snapshot total_amount preserves original $100.00 price", retrievedSnapshot.total_amount, 100.00);
    TestValidator.equals("snapshot paid_amount preserves original $100.00 price", retrievedSnapshot.paid_amount, 100.00);
    TestValidator.equals("snapshot customer_name matches original customer", retrievedSnapshot.customer_name, customerJoinResult.display_name);
    TestValidator.equals("snapshot customer_email matches original customer", retrievedSnapshot.customer_email, customerJoinResult.email);
    TestValidator.equals("snapshot seller_id matches original seller", retrievedSnapshot.seller.id, sellerJoinResult.id);
    TestValidator.equals("snapshot seller_email matches original seller", retrievedSnapshot.seller.email, sellerJoinResult.email);
    TestValidator.equals("snapshot order_number matches original order", retrievedSnapshot.order_number, order.order_number);
    TestValidator.equals("snapshot items_count preserved", retrievedSnapshot.items_count, 1);
    TestValidator.equals("snapshot shipping_cost preserved", retrievedSnapshot.shipping_cost, 0);
    TestValidator.equals("snapshot discount_amount preserved", retrievedSnapshot.discount_amount, 0);
    TestValidator.equals("snapshot created_at timestamp preserved", retrievedSnapshot.created_at, snapshot.created_at);
    // Validate snapshot immutability - even after product price change
    TestValidator.predicate("snapshot total_amount not affected by product price change", retrievedSnapshot.total_amount === 100.00);
}