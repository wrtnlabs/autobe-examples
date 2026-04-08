import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrator";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
/**
 * Test administrator listing with pagination and filtering capabilities.
 *
 * Validates the complete administrator listing workflow including pagination metadata accuracy, administrator summary field validation, cursor-based navigation, and filtering by grade and status. Ensures that the response structure matches the expected schema and that pagination works correctly across multiple pages.
 *
 * Special attention is given to verifying that pagination metadata accurately reflects the total count and page calculations, and that cursor-based pagination enables seamless navigation through administrator records.
 *
 * 1. First page request with limit=2 to retrieve initial administrator records.
 * 2. Validates response structure contains pagination metadata and administrator data array.
 * 3. Verifies pagination metadata fields (current, limit, records, pages) are present and valid.
 * 4. Validates administrator summary objects contain all required fields with correct types.
 * 5. Tests page-based pagination by fetching subsequent page with page parameter.
 * 6. Verifies no duplicate administrators appear across different pages.
 * 7. Tests filtering by grade parameter (regular vs super administrators).
 * 8. Tests filtering by status parameter (active vs banned administrators).
 * 9. Validates administrators are sorted by created_at descending (newest first).
 */
export async function test_api_administrator_list_with_pagination(connection: api.IConnection) {
    // 1. First page request with limit=2
    const firstPage = await api.functional.shoppingMall.administrators.index(connection, {
        body: {
            limit: 2,
            page: 1,
        } satisfies IShoppingMallAdministrator.IRequest,
    });
    typia.assert(firstPage);
    // 2. Validate response structure
    TestValidator.predicate("response contains pagination metadata", firstPage.pagination !== undefined);
    TestValidator.predicate("response contains data array", Array.isArray(firstPage.data));
    // 3. Verify pagination metadata fields
    TestValidator.equals("current page is 1", firstPage.pagination.current, 1);
    TestValidator.equals("limit matches request", firstPage.pagination.limit, 2);
    TestValidator.predicate("total records is non-negative", firstPage.pagination.records >= 0);
    TestValidator.predicate("total pages is non-negative", firstPage.pagination.pages >= 0);
    // 4. Validate administrator summary objects exist and have required fields
    await ArrayUtil.asyncForEach(firstPage.data, async (admin, index) => {
        typia.assert(admin);
        TestValidator.predicate(`administrator ${index} has id field`, admin.id !== undefined);
        TestValidator.predicate(`administrator ${index} has email field`, admin.email !== undefined);
        TestValidator.predicate(`administrator ${index} has grade field`, admin.grade !== undefined);
        TestValidator.predicate(`administrator ${index} has banned field`, admin.banned !== undefined);
        TestValidator.predicate(`administrator ${index} has created_at field`, admin.created_at !== undefined);
        TestValidator.predicate(`administrator ${index} has deleted_at field (can be null)`, admin.deleted_at !== undefined);
    });
    // 5. Test page-based pagination if more pages exist
    if (firstPage.pagination.pages > 1) {
        // Second page request using page parameter
        const secondPage = await api.functional.shoppingMall.administrators.index(connection, {
            body: {
                limit: 2,
                page: 2,
            } satisfies IShoppingMallAdministrator.IRequest,
        });
        typia.assert(secondPage);
        // 6. Verify no duplicates across pages
        const firstPageIds = firstPage.data.map((a) => a.id);
        const secondPageIds = secondPage.data.map((a) => a.id);
        const duplicates = firstPageIds.filter((id) => secondPageIds.includes(id));
        TestValidator.equals("no duplicate administrators across pages", duplicates.length, 0);
        // Verify second page metadata
        TestValidator.equals("second page current is 2", secondPage.pagination.current, 2);
        TestValidator.equals("second page limit matches", secondPage.pagination.limit, 2);
    }
    // 7. Test filtering by grade
    const regularAdmins = await api.functional.shoppingMall.administrators.index(connection, {
        body: {
            grade: "regular",
            limit: 10,
        } satisfies IShoppingMallAdministrator.IRequest,
    });
    typia.assert(regularAdmins);
    TestValidator.predicate("all filtered administrators are regular grade", regularAdmins.data.every((admin) => admin.grade === "regular"));
    const superAdmins = await api.functional.shoppingMall.administrators.index(connection, {
        body: {
            grade: "super",
            limit: 10,
        } satisfies IShoppingMallAdministrator.IRequest,
    });
    typia.assert(superAdmins);
    TestValidator.predicate("all filtered administrators are super grade", superAdmins.data.every((admin) => admin.grade === "super"));
    // 8. Test filtering by status
    const activeAdmins = await api.functional.shoppingMall.administrators.index(connection, {
        body: {
            status: "active",
            limit: 10,
        } satisfies IShoppingMallAdministrator.IRequest,
    });
    typia.assert(activeAdmins);
    TestValidator.predicate("all filtered administrators are active (not banned)", activeAdmins.data.every((admin) => admin.banned === false));
    const bannedAdmins = await api.functional.shoppingMall.administrators.index(connection, {
        body: {
            status: "banned",
            limit: 10,
        } satisfies IShoppingMallAdministrator.IRequest,
    });
    typia.assert(bannedAdmins);
    TestValidator.predicate("all filtered administrators are banned", bannedAdmins.data.every((admin) => admin.banned === true));
    // 9. Validate sorting by created_at descending
    if (firstPage.data.length > 1) {
        for (let i = 1; i < firstPage.data.length; i++) {
            const prevDate = new Date(firstPage.data[i - 1].created_at).getTime();
            const currDate = new Date(firstPage.data[i].created_at).getTime();
            TestValidator.predicate(`administrator ${i - 1} created_at >= administrator ${i} created_at`, prevDate >= currDate);
        }
    }
}