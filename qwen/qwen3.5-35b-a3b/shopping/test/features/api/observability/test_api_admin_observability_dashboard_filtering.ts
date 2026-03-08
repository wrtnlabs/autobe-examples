import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallDashboard";
import type { IEcommerceMallDashboardAuditLogMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallDashboardAuditLogMetric";
import type { IEcommerceMallDashboardInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallDashboardInventory";
import type { IEcommerceMallDashboardOrderLifecycle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallDashboardOrderLifecycle";
import type { IEcommerceMallDashboardPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallDashboardPerformance";
import type { IEcommerceMallDashboardReviewAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallDashboardReviewAnalytic";
import type { IEcommerceMallDashboardSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallDashboardSellerApproval";
import type { IEcommerceMallDashboardSystemHealth } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallDashboardSystemHealth";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallDashboard";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_observability_dashboard_filtering(connection: api.IConnection): Promise<void> {
    // 1. Admin setup and authentication
    const adminConnection: api.IConnection = { host: connection.host };
    const adminAuth = await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallAdmin.IJoin,
    });
    typia.assert(adminAuth);
    // Create admin connection with token
    const authenticatedAdminConnection: api.IConnection = {
        host: connection.host,
        headers: {
            Authorization: adminAuth.token.access,
        },
    };
    // 2. Test Case 1: timeRange='24h' + actorType='customer'
    const test1Request: IEcommerceMallDashboard.IRequest = {
        timeRange: "24h" as const,
        actorType: "customer" as const,
    };
    const test1Response = await api.functional.ecommerceMall.admin.observability.dashboard.index(authenticatedAdminConnection, { body: test1Request });
    typia.assert(test1Response);
    typia.assert(test1Response.data);
    // Validate filtering by actor type for customer metrics
    const test1Data = test1Response.data[0]!;
    TestValidator.equals("customer active sessions for 24h", test1Data.performance.active_sessions, 0);
    TestValidator.equals("time range 24h audit logs", test1Data.auditLogMetrics.totalLogEntriesLast24Hours, 0);
    // 3. Test Case 2: timeRange='7d' + actorType='seller'
    const test2Request: IEcommerceMallDashboard.IRequest = {
        timeRange: "7d" as const,
        actorType: "seller" as const,
    };
    const test2Response = await api.functional.ecommerceMall.admin.observability.dashboard.index(authenticatedAdminConnection, { body: test2Request });
    typia.assert(test2Response);
    typia.assert(test2Response.data);
    // Validate filtering by actor type for seller metrics
    const test2Data = test2Response.data[0]!;
    TestValidator.equals("seller active sessions for 7d", test2Data.performance.active_sessions, 0);
    TestValidator.equals("time range 7d audit logs", test2Data.auditLogMetrics.totalLogEntriesLast7Days, 0);
    // 4. Test Case 3: timeRange='365d' + no actorType (all actors)
    const test3Request: IEcommerceMallDashboard.IRequest = {
        timeRange: "365d" as const,
    };
    const test3Response = await api.functional.ecommerceMall.admin.observability.dashboard.index(authenticatedAdminConnection, { body: test3Request });
    typia.assert(test3Response);
    typia.assert(test3Response.data);
    // Validate filtering for all actors over 1 year
    const test3Data = test3Response.data[0]!;
    TestValidator.equals("all actors active sessions for 365d", test3Data.performance.active_sessions, 0);
    TestValidator.equals("time range 365d audit logs", test3Data.auditLogMetrics.totalLogEntriesLast7Days, 0);
    // 5. Validate all seven metric categories exist in response
    TestValidator.notEquals("systemHealth status exists", test3Data.systemHealth.status, undefined);
    TestValidator.notEquals("performance p50_latency_ms exists", test3Data.performance.p50_latency_ms, undefined);
    TestValidator.notEquals("inventory total_variants exists", test3Data.inventory.total_variants, undefined);
    TestValidator.notEquals("sellerApprovalQueue pending_seller_requests exists", test3Data.sellerApprovalQueue.pending_seller_requests, undefined);
    TestValidator.notEquals("orderLifecycle paidOrders exists", test3Data.orderLifecycle.paidOrders, undefined);
    TestValidator.notEquals("reviewAnalytics totalReviews exists", test3Data.reviewAnalytics.totalReviews, undefined);
    TestValidator.notEquals("auditLogMetrics totalLogEntriesLast24Hours exists", test3Data.auditLogMetrics.totalLogEntriesLast24Hours, undefined);
}
// Utility function for admin join
async function authorize_admin_join(connection: api.IConnection, props: {
    body?: IEcommerceMallAdmin.IJoin;
}): Promise<IEcommerceMallAdmin.IAuthorized> {
    const joinInput = {
        email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
        password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
        href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
        referrer: props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin;
    return await api.functional.ecommerceMall.auth.admin.join(connection, {
        body: joinInput,
    });
}