import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
export async function test_api_order_items_administrator_status_sorting_pagination(connection: api.IConnection): Promise<void> {
    // 1. Administrator joins and authenticates
    const adminAuth = await authorize_administrator_join(connection, {
        body: {
            display_name: "Test Admin",
            email: typia.random<string & tags.Format<"email">>(),
            password: "password123",
            grade: "regular",
        },
    });
    typia.assert(adminAuth);
    const adminConnection: api.IConnection = { host: connection.host };
    adminConnection.headers = { Authorization: adminAuth.token.access };
    // 2. Test status filtering for each valid status
    const statuses: Array<"paid" | "shipped" | "delivered" | "cancelled" | "refunded"> = ["paid", "shipped", "delivered", "cancelled", "refunded"];
    for (const status of statuses) {
        const result = await api.functional.ecommerceMall.administrator.order_items.index(adminConnection, {
            body: {
                status,
                limit: 10,
            } satisfies IEcommerceMallOrderItem.IRequest,
        });
        typia.assert(result);
        const statusArray = result.data.map((item) => item.status) as typeof status[];
        TestValidator.equals(`${status} filter - data type`, statusArray, Array(result.data.length).fill(status));
    }
    // 3. Test sorting by quantity (ASC and DESC)
    const quantityAsc = await api.functional.ecommerceMall.administrator.order_items.index(adminConnection, {
        body: {
            order_by: "quantity",
            order_direction: "ASC",
            limit: 10,
        } satisfies IEcommerceMallOrderItem.IRequest,
    });
    typia.assert(quantityAsc);
    const quantityDesc = await api.functional.ecommerceMall.administrator.order_items.index(adminConnection, {
        body: {
            order_by: "quantity",
            order_direction: "DESC",
            limit: 10,
        } satisfies IEcommerceMallOrderItem.IRequest,
    });
    typia.assert(quantityDesc);
    // Verify ascending order
    for (let i = 1; i < quantityAsc.data.length; i++) {
        TestValidator.predicate("quantity ASC sorted correctly", quantityAsc.data[i - 1].quantity <= quantityAsc.data[i].quantity);
    }
    // Verify descending order
    for (let i = 1; i < quantityDesc.data.length; i++) {
        TestValidator.predicate("quantity DESC sorted correctly", quantityDesc.data[i - 1].quantity >= quantityDesc.data[i].quantity);
    }
    // 4. Test sorting by unit_price (ASC and DESC)
    const priceAsc = await api.functional.ecommerceMall.administrator.order_items.index(adminConnection, {
        body: {
            order_by: "unit_price",
            order_direction: "ASC",
            limit: 10,
        } satisfies IEcommerceMallOrderItem.IRequest,
    });
    typia.assert(priceAsc);
    const priceDesc = await api.functional.ecommerceMall.administrator.order_items.index(adminConnection, {
        body: {
            order_by: "unit_price",
            order_direction: "DESC",
            limit: 10,
        } satisfies IEcommerceMallOrderItem.IRequest,
    });
    typia.assert(priceDesc);
    // Verify ascending price order
    for (let i = 1; i < priceAsc.data.length; i++) {
        TestValidator.predicate("unit_price ASC sorted correctly", priceAsc.data[i - 1].unit_price <= priceAsc.data[i].unit_price);
    }
    // Verify descending price order
    for (let i = 1; i < priceDesc.data.length; i++) {
        TestValidator.predicate("unit_price DESC sorted correctly", priceDesc.data[i - 1].unit_price >= priceDesc.data[i].unit_price);
    }
    // 5. Test pagination with limit=10 and cursor navigation
    const page1 = await api.functional.ecommerceMall.administrator.order_items.index(adminConnection, {
        body: {
            limit: 10,
        } satisfies IEcommerceMallOrderItem.IRequest,
    });
    typia.assert(page1);
    TestValidator.equals("page 1 - limit", page1.pagination.limit, 10);
    TestValidator.equals("page 1 - current", page1.pagination.current, 1);
    TestValidator.equals("page 1 - records", page1.pagination.records, page1.data.length);
    TestValidator.equals("page 1 - pages", page1.pagination.pages, page1.pagination.records > 0
        ? Math.ceil(page1.pagination.records / page1.pagination.limit)
        : 0);
    // Navigate to page 2 using cursor if available
    if (page1.pagination.pages >= 2 && page1.pagination.records > 0) {
        const page2 = await api.functional.ecommerceMall.administrator.order_items.index(adminConnection, {
            body: {
                limit: 10,
                page: null,
            } satisfies IEcommerceMallOrderItem.IRequest,
        });
        typia.assert(page2);
        TestValidator.equals("page 2 - current", page2.pagination.current, 2);
        // Verify no duplicates between pages
        const page1Ids = new Set(page1.data.map((item) => item.id));
        page2.data.forEach((item) => {
            TestValidator.predicate("no duplicate IDs between pages", !page1Ids.has(item.id));
        });
    }
    // 6. Test edge case: search with very restrictive date range (empty results)
    const emptyResult = await api.functional.ecommerceMall.administrator.order_items.index(adminConnection, {
        body: {
            status: "paid",
            limit: 10,
            created_at_from: "2020-01-01T00:00:00.000Z",
            created_at_to: "2020-01-02T00:00:00.000Z",
        } satisfies IEcommerceMallOrderItem.IRequest,
    });
    typia.assert(emptyResult);
    TestValidator.equals("empty result - data is array", Array.isArray(emptyResult.data), true);
    TestValidator.equals("empty result - records is zero", emptyResult.pagination.records, 0);
    TestValidator.equals("empty result - pages is zero", emptyResult.pagination.pages, 0);
}