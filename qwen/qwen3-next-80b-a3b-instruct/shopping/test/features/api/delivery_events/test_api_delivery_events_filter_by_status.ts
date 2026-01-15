import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEDeliveryEventSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEDeliveryEventSortBy";
import type { IESortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortOrder";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallDeliveryEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDeliveryEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallDeliveryEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeliveryEvent";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_delivery_events_filter_by_status(connection: api.IConnection): Promise<void> {
    // Step 1: Authenticate as admin using utility function
    const adminConnection: api.IConnection = { host: connection.host };
    const adminAuth = await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: "https://example.com/admin/join",
            referrer: "https://example.com/admin/signup"
        } satisfies IShoppingMallAdmin.IJoin
    });
    typia.assert(adminAuth);
    
    // Step 2: Retrieve initial delivery events
    const initialResponse: IPageIShoppingMallDeliveryEvent.ISummary = await api.functional.shoppingMall.admin.delivery_events.index(adminConnection, {
        body: {
            page: 1,
            limit: 50
        } satisfies IShoppingMallDeliveryEvent.IRequest
    });
    typia.assert(initialResponse);
    
    // Get the delivery events from the response
    const deliveryEvents = initialResponse.data;
    
    // Step 3: Test filtering by each of the 6 valid statuses
    const validStatuses: ("scheduled" | "in_transit" | "out_for_delivery" | "delivered" | "failed" | "cancelled")[] = ["scheduled", "in_transit", "out_for_delivery", "delivered", "failed", "cancelled"];
    
    // Find which statuses exist in our dataset
    const existingStatuses = [...new Set(deliveryEvents.map(event => event.delivery_status))];
    
    // Test filtering for each status that exists in our dataset
    for (const targetStatus of existingStatuses) {
        // Cast string to literal type using typia.assert
        const status: "scheduled" | "in_transit" | "out_for_delivery" | "delivered" | "failed" | "cancelled" = typia.assert<"scheduled" | "in_transit" | "out_for_delivery" | "delivered" | "failed" | "cancelled">(targetStatus);
        
        // Filter delivery events by status
        const response: IPageIShoppingMallDeliveryEvent.ISummary = await api.functional.shoppingMall.admin.delivery_events.index(adminConnection, {
            body: {
                status,
                page: 1,
                limit: 10,
                sort_by: "scheduled_date",
                order: "asc"
            } satisfies IShoppingMallDeliveryEvent.IRequest
        });
        typia.assert(response);
        
        // Validate pagination
        TestValidator.equals("page number is correct", response.pagination.current, 1);
        TestValidator.equals("limit is correct", response.pagination.limit, 10);
        TestValidator.predicate("total records > 0", () => response.pagination.records > 0);
        
        // Validate that all returned events have the target status
        for (const event of response.data) {
            TestValidator.equals("status matches filtered value", event.delivery_status, targetStatus);
        }
        
        // Validate sorting by scheduled_date in ascending order
        const scheduledDates = response.data.map(event => new Date(event.scheduled_delivery_date!));
        for (let i = 1; i < scheduledDates.length; i++) {
            TestValidator.predicate("scheduled_date is sorted ascending", () => scheduledDates[i - 1] <= scheduledDates[i]);
        }
    }
    
    // Step 4: Test pagination functionality
    // Find a status that has enough records for pagination
    for (const targetStatus of existingStatuses) {
        // Cast string to literal type using typia.assert
        const status: "scheduled" | "in_transit" | "out_for_delivery" | "delivered" | "failed" | "cancelled" = typia.assert<"scheduled" | "in_transit" | "out_for_delivery" | "delivered" | "failed" | "cancelled">(targetStatus);
        
        // Get events with this status
        const allForStatus: IPageIShoppingMallDeliveryEvent.ISummary = await api.functional.shoppingMall.admin.delivery_events.index(adminConnection, {
            body: {
                status,
                page: 1,
                limit: 100 // Maximum limit for better pagination test
            } satisfies IShoppingMallDeliveryEvent.IRequest
        });
        typia.assert(allForStatus);
        
        // Only test pagination if we have enough data
        if (allForStatus.pagination.records > 10) {
            const page2Response: IPageIShoppingMallDeliveryEvent.ISummary = await api.functional.shoppingMall.admin.delivery_events.index(adminConnection, {
                body: {
                    status,
                    page: 2,
                    limit: 5,
                    sort_by: "scheduled_date",
                    order: "asc"
                } satisfies IShoppingMallDeliveryEvent.IRequest
            });
            typia.assert(page2Response);
            
            // Validate second page pagination
            TestValidator.equals("second page number is correct", page2Response.pagination.current, 2);
            TestValidator.equals("second page limit is correct", page2Response.pagination.limit, 5);
        }
    }
    
    // Step 5: Test sorting in descending order
    // Pick a status with data
    if (existingStatuses.length > 0) {
        // Cast string to literal type using typia.assert
        const targetStatus: "scheduled" | "in_transit" | "out_for_delivery" | "delivered" | "failed" | "cancelled" = typia.assert<"scheduled" | "in_transit" | "out_for_delivery" | "delivered" | "failed" | "cancelled">(existingStatuses[0]);
        
        const descResponse: IPageIShoppingMallDeliveryEvent.ISummary = await api.functional.shoppingMall.admin.delivery_events.index(adminConnection, {
            body: {
                status: targetStatus,
                page: 1,
                limit: 10,
                sort_by: "scheduled_date",
                order: "desc"
            } satisfies IShoppingMallDeliveryEvent.IRequest
        });
        typia.assert(descResponse);
        
        // Validate descending sort
        const descScheduledDates = descResponse.data.map(event => new Date(event.scheduled_delivery_date!));
        for (let i = 1; i < descScheduledDates.length; i++) {
            TestValidator.predicate("scheduled_date is sorted descending", () => descScheduledDates[i - 1] >= descScheduledDates[i]);
        }
    }
    
    // Step 6: Test filtering with status not in dataset (should return empty)
    // Find a status that doesn't exist in current dataset
    let nonExistentStatus: "scheduled" | "in_transit" | "out_for_delivery" | "delivered" | "failed" | "cancelled" = "cancelled"; // Changed from const to let
    const allStatuses = new Set(deliveryEvents.map(event => event.delivery_status));
    
    for (const status of validStatuses) {
        if (!allStatuses.has(status)) {
            // We found a non-existing status
            nonExistentStatus = status;
            break;
        }
    }
    
    // If no non-existent status found, pick a new one not in the enum
    // But we must use only enum values, so if all exist, choose one that might not in this dataset
    // We'll use the first status that might not have enough to trigger empty result
    const nonExistentTestStatus: "scheduled" | "in_transit" | "out_for_delivery" | "delivered" | "failed" | "cancelled" = !allStatuses.has("cancelled") ? "cancelled" : "scheduled";
    
    // Cast the status to the literal type for API call
    const emptyResponse: IPageIShoppingMallDeliveryEvent.ISummary = await api.functional.shoppingMall.admin.delivery_events.index(adminConnection, {
        body: {
            status: typia.assert<"scheduled" | "in_transit" | "out_for_delivery" | "delivered" | "failed" | "cancelled">(nonExistentTestStatus),
            page: 1,
            limit: 10
        } satisfies IShoppingMallDeliveryEvent.IRequest
    });
    typia.assert(emptyResponse);
    
    // Verify that when filtering with a non-existing status, we get empty result
    TestValidator.equals("nonexistent status returns empty array", emptyResponse.data.length, 0);
    TestValidator.equals("nonexistent status records count", emptyResponse.pagination.records, 0);
}