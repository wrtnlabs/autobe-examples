import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductSnapshot";
import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_analytics_products_complex_filtering(connection: api.IConnection): Promise<void> {
    // 1. Authenticate as administrator
    const adminConnection: api.IConnection = { host: connection.host };
    const adminAuth = await authorize_administrator_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: typia.random<string & tags.Format<"password">>(),
        } satisfies IEcommerceAdministrator.IJoin,
    });
    typia.assert(adminAuth);

    // 2. Test basic pagination with minimal filters
    const basicResult = await api.functional.ecommerce.administrator.analytics.products.index(adminConnection, {
        body: {
            page: 1,
            limit: 10,
        } satisfies IEcommerceProductSnapshot.IRequest,
    });
    typia.assert(basicResult);
    TestValidator.predicate("basic result has pagination", basicResult.pagination !== undefined);
    TestValidator.predicate("basic result has data array", Array.isArray(basicResult.data));

    // 3. Test date range filtering
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dateFilterResult = await api.functional.ecommerce.administrator.analytics.products.index(adminConnection, {
        body: {
            created_at_from: oneMonthAgo.toISOString(),
            created_at_to: now.toISOString(),
            page: 1,
            limit: 5,
        } satisfies IEcommerceProductSnapshot.IRequest,
    });
    typia.assert(dateFilterResult);

    // 4. Test search term filtering
    const searchResult = await api.functional.ecommerce.administrator.analytics.products.index(adminConnection, {
        body: {
            search: "test",
            page: 1,
            limit: 5,
        } satisfies IEcommerceProductSnapshot.IRequest,
    });
    typia.assert(searchResult);

    // 5. Test filtering with UUID parameters (seller_id and category_id)
    const uuidFilterResult = await api.functional.ecommerce.administrator.analytics.products.index(adminConnection, {
        body: {
            seller_id: typia.random<string & tags.Format<"uuid">>(),
            category_id: typia.random<string & tags.Format<"uuid">>(),
            page: 1,
            limit: 3,
        } satisfies IEcommerceProductSnapshot.IRequest,
    });
    typia.assert(uuidFilterResult);

    // 6. Test multi-criteria combination
    const combinedResult = await api.functional.ecommerce.administrator.analytics.products.index(adminConnection, {
        body: {
            search: "product",
            created_at_from: oneMonthAgo.toISOString(),
            page: 1,
            limit: 3,
        } satisfies IEcommerceProductSnapshot.IRequest,
    });
    typia.assert(combinedResult);

    // 7. Test edge case - empty result scenario
    const futureDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const emptyResult = await api.functional.ecommerce.administrator.analytics.products.index(adminConnection, {
        body: {
            created_at_from: futureDate.toISOString(),
            page: 1,
            limit: 5,
        } satisfies IEcommerceProductSnapshot.IRequest,
    });
    typia.assert(emptyResult);
    TestValidator.equals("empty result should have zero records", emptyResult.pagination.records, 0);
    TestValidator.equals("empty result should have empty data", emptyResult.data.length, 0);

    // 8. Validate pagination consistency across all results
    const results = [basicResult, dateFilterResult, searchResult, uuidFilterResult, combinedResult];
    for (const result of results) {
        if (result.pagination.records > 0) {
            TestValidator.predicate("pagination records should be non-negative", result.pagination.records >= 0);
            TestValidator.predicate("pagination limit should be within bounds", result.pagination.limit >= 1 && result.pagination.limit <= 100);
            TestValidator.predicate("pagination pages should be correctly calculated", result.pagination.pages === Math.ceil(result.pagination.records / result.pagination.limit) || result.pagination.pages === 0);
        }
    }
}