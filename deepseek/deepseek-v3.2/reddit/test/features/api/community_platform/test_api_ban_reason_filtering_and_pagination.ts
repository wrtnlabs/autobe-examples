import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformBanReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanReason";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformBanReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBanReason";
export async function test_api_ban_reason_filtering_and_pagination(connection: api.IConnection): Promise<void> {
    // Test 1: Basic pagination with default parameters
    const defaultPage = await api.functional.communityPlatform.ban_reasons.index(connection, {
        body: {
            page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
            limit: typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>>(),
        } satisfies ICommunityPlatformBanReason.IRequest,
    });
    typia.assert(defaultPage);
    // Validate pagination metadata
    TestValidator.predicate("has pagination metadata", defaultPage.pagination !== undefined);
    TestValidator.equals("current page matches request", defaultPage.pagination.current, 1);
    TestValidator.predicate("limit within bounds", defaultPage.pagination.limit >= 1 && defaultPage.pagination.limit <= 100);
    TestValidator.predicate("total records non-negative", defaultPage.pagination.records >= 0);
    TestValidator.predicate("total pages non-negative", defaultPage.pagination.pages >= 0);
    // Test 2: Filter by active status (true)
    const activeOnly = await api.functional.communityPlatform.ban_reasons.index(connection, {
        body: {
            active: true,
            page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
            limit: typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>>(),
        } satisfies ICommunityPlatformBanReason.IRequest,
    });
    typia.assert(activeOnly);
    // Verify all returned records are active
    for (const reason of activeOnly.data) {
        TestValidator.predicate(`reason ${reason.id} is active`, reason.active === true);
    }
    // Test 3: Filter by active status (false)
    const inactiveOnly = await api.functional.communityPlatform.ban_reasons.index(connection, {
        body: {
            active: false,
            page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
            limit: typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>>(),
        } satisfies ICommunityPlatformBanReason.IRequest,
    });
    typia.assert(inactiveOnly);
    // Verify all returned records are inactive
    for (const reason of inactiveOnly.data) {
        TestValidator.predicate(`reason ${reason.id} is inactive`, reason.active === false);
    }
    // Test 4: Filter by active null (should return all regardless of status)
    const allStatus = await api.functional.communityPlatform.ban_reasons.index(connection, {
        body: {
            active: null,
            page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
            limit: typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>>(),
        } satisfies ICommunityPlatformBanReason.IRequest,
    });
    typia.assert(allStatus);
    // Validate that mixed status records exist (some active, some inactive, or all of one type)
    const hasActive = allStatus.data.some(reason => reason.active === true);
    const hasInactive = allStatus.data.some(reason => reason.active === false);
    TestValidator.predicate("null active filter returns data", allStatus.data.length > 0);
    // Note: It's valid to have only active or only inactive if that's what exists in the database
}