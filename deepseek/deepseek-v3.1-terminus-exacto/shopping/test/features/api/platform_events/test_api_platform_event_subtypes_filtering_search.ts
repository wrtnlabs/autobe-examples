import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommercePlatformEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEvent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformEvent";
import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_platform_event_subtypes_filtering_search(connection: api.IConnection): Promise<void> {
    // 1. Authenticate as administrator using utility function
    const adminConnection: api.IConnection = { host: connection.host };
    const admin = await authorize_administrator_join(adminConnection, {});
    typia.assert(admin);
    
    // 2. We need an eventId - in real scenario would come from existing data
    // Use a random UUID; API will validate existence
    const eventId = typia.random<string & tags.Format<"uuid">>();
    
    // 3. Test 1: Basic filtering with pagination
    const result1 = await api.functional.ecommerce.administrator.platform_events.subtypes.index(adminConnection, {
        eventId,
        body: {
            event_type: "system_startup",
            page: 1,
            limit: 10,
        } satisfies IEcommercePlatformEvent.IRequest,
    });
    typia.assert(result1);
    
    // Validate pagination metadata
    TestValidator.equals("pagination current page", result1.pagination.current, 1);
    TestValidator.equals("pagination limit", result1.pagination.limit, 10);
    TestValidator.predicate("records non-negative", result1.pagination.records >= 0);
    TestValidator.predicate("pages non-negative", result1.pagination.pages >= 0);
    
    // If events returned, validate event_type filter
    if (result1.data.length > 0) {
        for (const event of result1.data) {
            TestValidator.equals("event_type matches filter", event.event_type, "system_startup");
        }
    }
    
    // 4. Test 2: Combined filtering by severity and source
    const result2 = await api.functional.ecommerce.administrator.platform_events.subtypes.index(adminConnection, {
        eventId,
        body: {
            event_severity: "warning",
            event_source: "customer_service",
            page: 1,
            limit: 20,
        } satisfies IEcommercePlatformEvent.IRequest,
    });
    typia.assert(result2);
    
    if (result2.data.length > 0) {
        for (const event of result2.data) {
            TestValidator.equals("event_severity matches filter", event.event_severity, "warning");
            TestValidator.equals("event_source matches filter", event.event_source, "customer_service");
        }
    }
    
    // 5. Test 3: Date range filtering with proper type safety
    const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago
    const dateTo = new Date().toISOString();
    
    const result3 = await api.functional.ecommerce.administrator.platform_events.subtypes.index(adminConnection, {
        eventId,
        body: {
            date_from: dateFrom satisfies string & tags.Format<"date-time"> as string & tags.Format<"date-time">,
            date_to: dateTo satisfies string & tags.Format<"date-time"> as string & tags.Format<"date-time">,
            page: 1,
            limit: 10,
        } satisfies IEcommercePlatformEvent.IRequest,
    });
    typia.assert(result3);
    
    if (result3.data.length > 0) {
        for (const event of result3.data) {
            const eventDate = new Date(event.created_at);
            const fromDate = new Date(dateFrom);
            const toDate = new Date(dateTo);
            TestValidator.predicate("event date after from date", eventDate >= fromDate);
            TestValidator.predicate("event date before to date", eventDate <= toDate);
        }
    }
    
    // 6. Test 4: Text search functionality
    const searchText = "test";
    const result4 = await api.functional.ecommerce.administrator.platform_events.subtypes.index(adminConnection, {
        eventId,
        body: {
            search: searchText,
            page: 1,
            limit: 10,
        } satisfies IEcommercePlatformEvent.IRequest,
    });
    typia.assert(result4);
    
    // 7. Test 5: Null filters (should return all)
    const result5 = await api.functional.ecommerce.administrator.platform_events.subtypes.index(adminConnection, {
        eventId,
        body: {
            event_type: null,
            event_severity: null,
            event_source: null,
            date_from: null,
            date_to: null,
            search: null,
            page: 1,
            limit: 5,
        } satisfies IEcommercePlatformEvent.IRequest,
    });
    typia.assert(result5);
    
    // 8. Test 6: Pagination boundary testing
    const result6 = await api.functional.ecommerce.administrator.platform_events.subtypes.index(adminConnection, {
        eventId,
        body: {
            page: 100,
            limit: 100,
        } satisfies IEcommercePlatformEvent.IRequest,
    });
    typia.assert(result6);
    
    // Should handle out-of-bounds pages gracefully
    if (result6.pagination.current > result6.pagination.pages) {
        TestValidator.equals("empty data for out-of-bounds page", result6.data.length, 0);
    }
}

// Local authorize_administrator_join function removed - using imported utility instead