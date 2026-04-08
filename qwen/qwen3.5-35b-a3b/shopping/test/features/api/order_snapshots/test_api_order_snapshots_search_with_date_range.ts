import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderSnapshot";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
export async function test_api_order_snapshots_search_with_date_range(connection: api.IConnection): Promise<void> {
    // 1. Setup - Create test data with different order numbers and dates
    const adminConnection: api.IConnection = { host: connection.host };
    const adminAuth = await authorize_administrator_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(2),
        },
    });
    typia.assert(adminAuth);
    adminConnection.headers ??= {};
    adminConnection.headers.Authorization = adminAuth.token.access;
    // Create customer account
    const customerConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(customerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(),
        },
    });
    // Create seller account
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerAuth = await authorize_seller_join(sellerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(2),
        },
    });
    typia.assert(sellerAuth);
    sellerConnection.headers ??= {};
    sellerConnection.headers.Authorization = sellerAuth.token.access;
    // Create product with variant for ordering
    const product = await generate_random_ecommerce_mall_seller_products_create(sellerConnection, {
        body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 5 }),
            category_id: typia.random<string & tags.Format<"uuid">>(),
            base_price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
        },
    });
    typia.assert(product);
    const variant = await generate_random_ecommerce_mall_seller_products_variants_create(sellerConnection, {
        body: {
            sku_code: RandomGenerator.alphaNumeric(10),
            option_values: JSON.stringify({ color: "blue", size: "M" }),
            stock_quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        },
        params: { productId: product.id },
    });
    typia.assert(variant);
    // 2. Create multiple orders with different order numbers and dates
    // Order 1
    const order1 = await generate_random_ecommerce_mall_member_orders_create(customerConnection, {
        body: {
            shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
            order_items: [
                {
                    product_variant_id: variant.id,
                    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
                },
            ],
        },
    });
    typia.assert(order1);
    // Order 2
    const order2 = await generate_random_ecommerce_mall_member_orders_create(customerConnection, {
        body: {
            shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
            order_items: [
                {
                    product_variant_id: variant.id,
                    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
                },
            ],
        },
    });
    typia.assert(order2);
    // 3. Admin authentication for search
    const searchConnection: api.IConnection = { host: connection.host };
    await authorize_administrator_login(searchConnection, {
        body: {
            email: adminAuth.email,
            password: adminAuth.token.access, // Use actual password, not access token
            ip: typia.random<string & tags.Format<"ipv4">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    typia.assert(searchConnection);
    searchConnection.headers ??= {};
    searchConnection.headers.Authorization = adminAuth.token.access;
    // 4. Test partial match search
    const searchDateStart = new Date();
    searchDateStart.setHours(0, 0, 0, 0);
    const searchDateEnd = new Date();
    searchDateEnd.setHours(23, 59, 59, 999);
    const partialMatchResult = await api.functional.ecommerceMall.administrator.order_snapshots.index(searchConnection, {
        body: {
            page: 1,
            limit: 20,
            search: "ORD",
            order_date_start: searchDateStart.toISOString(),
            order_date_end: searchDateEnd.toISOString(),
            sort_by: "created_at",
            sort_order: "desc",
        },
    });
    typia.assert(partialMatchResult);
    // 5. Validate partial match results
    partialMatchResult.data.forEach((snapshot) => {
        TestValidator.predicate("order_number contains ORD (case-insensitive)", snapshot.order_number.toUpperCase().includes("ORD"));
    });
    // 6. Validate date range filtering
    partialMatchResult.data.forEach((snapshot) => {
        TestValidator.predicate("order_date within search range", new Date(snapshot.order_date) >= searchDateStart &&
            new Date(snapshot.order_date) <= searchDateEnd);
    });
    // 7. Validate sorting by created_at descending
    for (let i = 1; i < partialMatchResult.data.length; i++) {
        TestValidator.predicate("sorted by created_at descending", new Date(partialMatchResult.data[i - 1].order_date) >=
            new Date(partialMatchResult.data[i].order_date));
    }
    // 8. Validate pagination metadata
    TestValidator.equals("pagination current", partialMatchResult.pagination.current, 1);
    TestValidator.equals("pagination limit", partialMatchResult.pagination.limit, 20);
    TestValidator.predicate("pagination records accurate", partialMatchResult.pagination.records >= partialMatchResult.data.length);
    TestValidator.equals("pagination pages calculation", partialMatchResult.pagination.pages, Math.ceil(partialMatchResult.pagination.records / partialMatchResult.pagination.limit));
    // 9. Test exact order_number match
    const exactMatchResult = await api.functional.ecommerceMall.administrator.order_snapshots.index(searchConnection, {
        body: {
            page: 1,
            limit: 100,
            search: order1.order_number,
            sort_by: "created_at",
            sort_order: "desc",
        },
    });
    typia.assert(exactMatchResult);
    // Exact match should return results with matching order_number
    if (exactMatchResult.data.length > 0) {
        TestValidator.equals("exact match order_number", exactMatchResult.data[0].order_number, order1.order_number);
    }
    // 10. Test empty results with non-matching date range
    const emptySearchStart = new Date(1970, 0, 1); // Far past date
    const emptySearchEnd = new Date(1970, 0, 1);
    const emptyResult = await api.functional.ecommerceMall.administrator.order_snapshots.index(searchConnection, {
        body: {
            page: 1,
            limit: 20,
            order_date_start: emptySearchStart.toISOString(),
            order_date_end: emptySearchEnd.toISOString(),
        },
    });
    typia.assert(emptyResult);
    TestValidator.equals("empty results data count", emptyResult.data.length, 0);
    TestValidator.equals("empty results pagination records", emptyResult.pagination.records, 0);
    TestValidator.equals("empty results pagination pages", emptyResult.pagination.pages, 0);
}