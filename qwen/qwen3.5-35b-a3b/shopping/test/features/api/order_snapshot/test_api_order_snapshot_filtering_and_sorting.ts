import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
/**
 * Test seller's ability to filter and sort order snapshots using various criteria.
 *
 * Validates the complete order snapshot filtering and sorting workflow including seller
 * authentication, product creation, order placement by customers, and comprehensive
 * testing of filter and sort parameters for order snapshot queries.
 *
 * Special attention is given to verifying that snapshots are correctly filtered by
 * entity type, date range, order number patterns, and entity status. The test also
 * validates that sorting is correctly applied across multiple fields (created_at,
 * order_date, entity_name) and that pagination metadata remains accurate after
 * filtering operations.
 *
 * 1. Seller registers and logs in to create test products.
 * 2. Multiple products are created by the seller.
 * 3. Customer registers and places orders for the products.
 * 4. Order snapshots are automatically created during order creation.
 * 5. Various filter combinations are tested (entity_type, date range, order number).
 * 6. Sorting is validated for created_at, order_date, and entity_name fields.
 */
export async function test_api_order_snapshot_filtering_and_sorting(connection: api.IConnection): Promise<void> {
    // 1. Seller registration
    const sellerJoinConnection: api.IConnection = { host: connection.host };
    const sellerEmail = typia.random<string & tags.Format<"email">>();
    const sellerPassword = RandomGenerator.alphaNumeric(16);
    const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
        body: {
            email: sellerEmail,
            password: sellerPassword,
            display_name: RandomGenerator.name(),
        },
    });
    typia.assert(sellerAuth);
    // 2. Seller login
    const sellerConnection: api.IConnection = { host: connection.host };
    await authorize_seller_login(sellerConnection, {
        body: {
            email: sellerEmail,
            password: sellerPassword,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        },
    });
    // 3. Create multiple products
    const products: IEcommerceMallProduct[] = [];
    for (let i = 0; i < 3; i++) {
        const product = await generate_random_ecommerce_mall_seller_products_create(sellerConnection, {
            body: {
                name: RandomGenerator.name(2),
                description: RandomGenerator.paragraph({ sentences: 2 }),
                category_id: typia.random<string & tags.Format<"uuid">>(),
                base_price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
            },
        });
        typia.assert(product);
        products.push(product);
    }
    // 4. Customer registration
    const memberJoinConnection: api.IConnection = { host: connection.host };
    const memberEmail = typia.random<string & tags.Format<"email">>();
    const memberPassword = RandomGenerator.alphaNumeric(16);
    const memberAuth = await authorize_member_join(memberJoinConnection, {
        body: {
            email: memberEmail,
            password: memberPassword,
            display_name: RandomGenerator.name(),
        },
    });
    typia.assert(memberAuth);
    // 5. Customer login
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_login(memberConnection, {
        body: {
            email: memberEmail,
            password: memberPassword,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        },
    });
    // 6. Place orders for products
    const orders: IEcommerceMallOrder[] = [];
    for (const product of products) {
        const productVariant = product.variants.find((v) => v.stock_quantity > 0) ?? product.variants[0];
        const order = await generate_random_ecommerce_mall_member_orders_create(memberConnection, {
            body: {
                shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
                order_items: [
                    {
                        product_variant_id: productVariant?.id ?? typia.random<string & tags.Format<"uuid">>(),
                        quantity: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>>(),
                    },
                ],
            } satisfies IEcommerceMallOrder.ICreate,
        });
        typia.assert(order);
        orders.push(order);
    }
    // 7. Test filtering by entity_type
    const entityFilterResult = await api.functional.ecommerceMall.seller.order_snapshots.index(sellerConnection, {
        body: {
            entity_type: "ORDER_ITEM",
            limit: 100,
        },
    });
    typia.assert(entityFilterResult);
    TestValidator.predicate("entity type filter returns matching snapshots", entityFilterResult.data.every((snapshot) => snapshot.order_status === "paid"));
    // 8. Test filtering by order_date_range
    const dateRangeStart = new Date(orders[0].created_at).getTime() - 86400000;
    const dateRangeEnd = new Date(orders[orders.length - 1].created_at).getTime() + 86400000;
    const dateRangeFilterResult = await api.functional.ecommerceMall.seller.order_snapshots.index(sellerConnection, {
        body: {
            order_date_start: new Date(dateRangeStart).toISOString(),
            order_date_end: new Date(dateRangeEnd).toISOString(),
            limit: 100,
        },
    });
    typia.assert(dateRangeFilterResult);
    TestValidator.predicate("date range filter returns snapshots in range", dateRangeFilterResult.data.every((snapshot) => {
        const snapshotDate = new Date(snapshot.order_date).getTime();
        const startDate = new Date(dateRangeStart).getTime();
        const endDate = new Date(dateRangeEnd).getTime();
        return snapshotDate >= startDate && snapshotDate <= endDate;
    }));
    // 9. Test filtering by order_number (partial match)
    const firstOrderNumber = orders[0].order_number;
    const searchPattern = firstOrderNumber.substring(0, 8);
    const orderNumberFilterResult = await api.functional.ecommerceMall.seller.order_snapshots.index(sellerConnection, {
        body: {
            search: searchPattern,
            limit: 100,
        },
    });
    typia.assert(orderNumberFilterResult);
    TestValidator.predicate("order number search returns matching results", orderNumberFilterResult.data.every((snapshot) => snapshot.order_number.includes(searchPattern)));
    // 10. Test filtering by entity_status
    const statusFilterResult = await api.functional.ecommerceMall.seller.order_snapshots.index(sellerConnection, {
        body: {
            entity_status: "paid",
            limit: 100,
        },
    });
    typia.assert(statusFilterResult);
    TestValidator.equals("entity status filter returns matching results", statusFilterResult.data.every((snapshot) => snapshot.order_status === "paid"), true);
    // 11. Test sorting by created_at asc
    const createdAtAscSort = await api.functional.ecommerceMall.seller.order_snapshots.index(sellerConnection, {
        body: {
            sort_by: "created_at",
            sort_order: "asc",
            limit: 100,
        },
    });
    typia.assert(createdAtAscSort);
    TestValidator.predicate("created_at asc sort orders correctly", createdAtAscSort.data.every((snapshot, index, arr) => {
        if (index === 0)
            return true;
        return new Date(snapshot.order_date).getTime() >= new Date(arr[index - 1].order_date).getTime();
    }));
    // 12. Test sorting by created_at desc
    const createdAtDescSort = await api.functional.ecommerceMall.seller.order_snapshots.index(sellerConnection, {
        body: {
            sort_by: "created_at",
            sort_order: "desc",
            limit: 100,
        },
    });
    typia.assert(createdAtDescSort);
    TestValidator.predicate("created_at desc sort orders correctly", createdAtDescSort.data.every((snapshot, index, arr) => {
        if (index === 0)
            return true;
        return new Date(snapshot.order_date).getTime() <= new Date(arr[index - 1].order_date).getTime();
    }));
    // 13. Test sorting by order_date asc
    const orderDateAscSort = await api.functional.ecommerceMall.seller.order_snapshots.index(sellerConnection, {
        body: {
            sort_by: "order_date",
            sort_order: "asc",
            limit: 100,
        },
    });
    typia.assert(orderDateAscSort);
    TestValidator.predicate("order_date asc sort orders correctly", orderDateAscSort.data.every((snapshot, index, arr) => {
        if (index === 0)
            return true;
        return new Date(snapshot.order_date).getTime() >= new Date(arr[index - 1].order_date).getTime();
    }));
    // 14. Test sorting by order_date desc
    const orderDateDescSort = await api.functional.ecommerceMall.seller.order_snapshots.index(sellerConnection, {
        body: {
            sort_by: "order_date",
            sort_order: "desc",
            limit: 100,
        },
    });
    typia.assert(orderDateDescSort);
    TestValidator.predicate("order_date desc sort orders correctly", orderDateDescSort.data.every((snapshot, index, arr) => {
        if (index === 0)
            return true;
        return new Date(snapshot.order_date).getTime() <= new Date(arr[index - 1].order_date).getTime();
    }));
    // 15. Test combination of filters
    const combinationFilterResult = await api.functional.ecommerceMall.seller.order_snapshots.index(sellerConnection, {
        body: {
            entity_type: "ORDER_ITEM",
            order_date_start: new Date(dateRangeStart).toISOString(),
            search: searchPattern,
            sort_by: "created_at",
            sort_order: "desc",
            limit: 100,
        },
    });
    typia.assert(combinationFilterResult);
    TestValidator.predicate("combination filter returns correct results", combinationFilterResult.data.length > 0 &&
        combinationFilterResult.data.every((snapshot) => {
            const snapshotDate = new Date(snapshot.order_date).getTime();
            const startDate = new Date(dateRangeStart).getTime();
            return snapshot.order_number.includes(searchPattern) &&
                snapshotDate >= startDate;
        }));
    // 16. Verify pagination metadata
    TestValidator.equals("pagination metadata is accurate", combinationFilterResult.data.length <= combinationFilterResult.pagination.limit, true);
    TestValidator.predicate("total records count is accurate", combinationFilterResult.pagination.records >=
        combinationFilterResult.data.length);
}