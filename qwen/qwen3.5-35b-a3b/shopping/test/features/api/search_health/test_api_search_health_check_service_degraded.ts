import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { ISearchHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ISearchHealthMetric";
import type { ISearchHealthStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ISearchHealthStatus";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_search_health_check_service_degraded(connection: api.IConnection): Promise<void> {
    // 1. Admin authentication
    const adminConnection: api.IConnection = { host: connection.host };
    const admin: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: typia.random<string & tags.Format<"password">>(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        },
    });
    typia.assert(admin);
    // 2. Create admin connection with token
    const adminAuthConnection: api.IConnection = {
        host: connection.host,
        headers: {
            ...connection.headers,
            Authorization: admin.token.access,
        },
    };
    // 3. Call health check endpoint
    const healthStatus: ISearchHealthStatus = await api.functional.ecommerceMall.admin.search.health.check(adminAuthConnection);
    typia.assert(healthStatus);
    // 4. Validate degraded status field
    TestValidator.equals("health status is degraded", healthStatus.status, "degraded");
    // 5. Validate lastUpdated is valid date-time
    const lastUpdatedDate = new Date(healthStatus.lastUpdated);
    TestValidator.predicate("lastUpdated is valid date-time", () => !isNaN(lastUpdatedDate.getTime()));
    // 6. Validate metrics exist
    const metrics = healthStatus.metrics;
    if (metrics === null) {
        throw new Error("metrics is null");
    }
    // 7. Validate availability status is available (service is reachable)
    TestValidator.equals("availability status is available", metrics.availabilityStatus, "available");
    // 8. Validate total indexed count is positive
    TestValidator.predicate("total indexed count is positive", metrics.totalIndexedCount > 0);
    // 9. Validate freshness hours indicate degraded state (>1 hour but <24 hours)
    if (metrics.freshnessHours === null) {
        throw new Error("freshnessHours is null");
    }
    TestValidator.predicate("freshness hours greater than 1 hour", metrics.freshnessHours > 1.0);
    TestValidator.predicate("freshness hours less than 24 hours", metrics.freshnessHours < 24.0);
    // 10. Business logic: degraded means service operational but data stale
    TestValidator.equals("availability matches degraded status", metrics.availabilityStatus, "available");
}