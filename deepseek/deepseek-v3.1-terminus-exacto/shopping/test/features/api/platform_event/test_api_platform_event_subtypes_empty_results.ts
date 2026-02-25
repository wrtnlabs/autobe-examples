import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEvent";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformEvent";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_platform_event_subtypes_empty_results(connection: api.IConnection): Promise<void> {
    // Create super administrator connection
    const superAdminConnection: api.IConnection = { host: connection.host };
    
    // Create valid join data
    const joinData: IEcommerceSuperAdministrator.IJoin = {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>()
    };
    
    await authorize_super_administrator_join(superAdminConnection, {
        body: joinData
    });

    // Get a reference platform event
    const referenceEvents = await api.functional.ecommerce.superAdministrator.platform_events.index(superAdminConnection, { 
        body: { limit: 1, page: 1 } satisfies IEcommercePlatformEvent.IRequest 
    });
    typia.assert(referenceEvents);

    // Use first event ID or generate a valid UUID if none exist
    const eventId = referenceEvents.data.length > 0
        ? referenceEvents.data[0].id
        : typia.random<string & tags.Format<"uuid">>();

    // Create restrictive but valid filters for empty results
    const emptyRequest: IEcommercePlatformEvent.IRequest = {
        event_type: "system_startup",
        event_severity: "critical",
        date_from: new Date(Date.now() - 86400000).toISOString(),
        date_to: new Date().toISOString(),
        search: RandomGenerator.alphaNumeric(32),
        limit: 10,
        page: 1,
    };

    const emptyResult = await api.functional.ecommerce.superAdministrator.platform_events.subtypes.index(superAdminConnection, { 
        eventId, 
        body: emptyRequest 
    });
    typia.assert(emptyResult);

    // Validate empty result structure
    TestValidator.equals("pagination records should be zero", emptyResult.pagination.records, 0);
    TestValidator.equals("pagination pages should be zero", emptyResult.pagination.pages, 0);
    TestValidator.equals("pagination current page should be 1", emptyResult.pagination.current, 1);
    TestValidator.equals("pagination limit should match request", emptyResult.pagination.limit, 10);
    TestValidator.equals("data array should be empty", emptyResult.data.length, 0);
}