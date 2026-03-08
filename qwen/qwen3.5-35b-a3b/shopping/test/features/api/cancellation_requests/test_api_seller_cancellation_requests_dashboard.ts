import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_seller_cancellation_requests_dashboard(connection: api.IConnection): Promise<void> {
    // 1. Seller authentication
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerAuth = await authorize_seller_join(sellerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        },
    });
    typia.assert(sellerAuth);
    // 2. Create another seller to test isolation
    const otherSellerConnection: api.IConnection = { host: connection.host };
    const otherSellerAuth = await authorize_seller_join(otherSellerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        },
    });
    typia.assert(otherSellerAuth);
    // 3. Test with empty result set (seller has no cancellation requests)
    const emptyResult = await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(sellerConnection, {
        body: {},
    });
    typia.assert(emptyResult);
    TestValidator.equals("empty result - data is array", emptyResult.data, []);
    TestValidator.equals("empty result - pagination correct", emptyResult.pagination.records, 0);
    TestValidator.equals("empty result - pages is 0", emptyResult.pagination.pages, 0);
    // 4. Test pagination with different page sizes
    const pageSize100 = await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(sellerConnection, {
        body: { pageSize: 100 },
    });
    typia.assert(pageSize100);
    TestValidator.equals("max page size (100)", pageSize100.pagination.limit, 100);
    const pageSize10 = await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(sellerConnection, {
        body: { pageSize: 10 },
    });
    typia.assert(pageSize10);
    TestValidator.equals("min page size (10)", pageSize10.pagination.limit, 10);
    // 5. Test filtering by status
    const pendingFilter = await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(sellerConnection, {
        body: { requestStatus: "pending" },
    });
    typia.assert(pendingFilter);
    TestValidator.predicate("filter by pending - all requests are pending", pendingFilter.data.every((r) => r.request_status === "pending"));
    const approvedFilter = await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(sellerConnection, {
        body: { requestStatus: "approved" },
    });
    typia.assert(approvedFilter);
    TestValidator.predicate("filter by approved - all requests are approved", approvedFilter.data.every((r) => r.request_status === "approved"));
    const rejectedFilter = await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(sellerConnection, {
        body: { requestStatus: "rejected" },
    });
    typia.assert(rejectedFilter);
    TestValidator.predicate("filter by rejected - all requests are rejected", rejectedFilter.data.every((r) => r.request_status === "rejected"));
    // 6. Test text search
    const searchText = RandomGenerator.paragraph({ sentences: 2 });
    const searchResult = await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(sellerConnection, {
        body: { search: searchText },
    });
    typia.assert(searchResult);
    // All returned requests should contain the search text
    const allContainSearch = searchResult.data.every((r) => r.reason.includes(searchText));
    TestValidator.predicate("search results contain search text", allContainSearch);
    // 7. Test date range filtering
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dateRangeResult = await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(sellerConnection, {
        body: {
            createdFrom: weekAgo.toISOString(),
            createdTo: now.toISOString(),
        },
    });
    typia.assert(dateRangeResult);
    // 8. Test combined filters
    const combinedFilter = await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(sellerConnection, {
        body: {
            requestStatus: "pending",
            search: searchText,
            createdFrom: weekAgo.toISOString(),
        },
    });
    typia.assert(combinedFilter);
    // All results should match all filters
    const allMatchCombined = combinedFilter.data.every((r) => r.request_status === "pending" && r.reason.includes(searchText));
    TestValidator.predicate("combined filter - all results match all filters", allMatchCombined);
    // 9. Test timestamp format validation
    const defaultResult = await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(sellerConnection, {
        body: {},
    });
    typia.assert(defaultResult);
    // Validate all timestamps are valid ISO 8601 format
    const validTimestamps = defaultResult.data.every((r) => {
        const created = new Date(r.created_at);
        const updated = new Date(r.updated_at);
        return !isNaN(created.getTime()) && !isNaN(updated.getTime());
    });
    TestValidator.predicate("all timestamps are valid ISO 8601", validTimestamps);
    // 10. Test required fields in response
    const requiredFieldsCheck = defaultResult.data.every((r) => r.id !== undefined &&
        r.customer_id !== undefined &&
        r.order_item_id !== undefined &&
        r.reason !== undefined &&
        r.request_status !== undefined &&
        r.created_at !== undefined &&
        r.updated_at !== undefined);
    TestValidator.predicate("all required fields present", requiredFieldsCheck);
}