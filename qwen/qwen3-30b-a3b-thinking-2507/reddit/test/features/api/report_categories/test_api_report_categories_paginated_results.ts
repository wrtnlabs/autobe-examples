import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportCategory";
export async function test_api_report_categories_paginated_results(connection: api.IConnection): Promise<void> {
    // Create actor-specific connection
    const adminConnection: api.IConnection = { host: connection.host };
    
    // Execute paginated request with page=1, limit=10
    const output = await api.functional.communityPlatform.report_categories.index(adminConnection, {
        body: {
            page: 1,
            limit: 10,
        }
    });
    
    // Validate response structure
    typia.assert(output);
    
    // Validate pagination metadata
    TestValidator.equals("Correct current page", output.pagination.current, 1);
    TestValidator.equals("Correct limit", output.pagination.limit, 10);
    TestValidator.predicate("Records count > 0", output.pagination.records > 0);
}