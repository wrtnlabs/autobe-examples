import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator's ability to track topic evolution by searching sections
 * with available filtering and sorting capabilities.
 */
export async function test_api_section_admin_evolution_tracking(connection: api.IConnection): Promise<void> {
    // 1. Create administrator connection
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
        } satisfies IDiscussionBoardAdmin.IJoin,
    });
    // Note: Section creation endpoint not available in provided SDK.
    // This test focuses on searching existing sections in the database.
    // 2. Test search with empty request (get all sections)
    const initialResults = await api.functional.discussionBoard.admin.topics.index(adminConnection, {
        body: {} satisfies IDiscussionBoardSection.IRequest,
    });
    typia.assert(initialResults);
    TestValidator.predicate("returns pagination structure", initialResults.pagination !== undefined);
    // 3. Test search term filtering
    if (initialResults.data.length > 0) {
        const sampleSection = RandomGenerator.pick(initialResults.data);
        const searchTerm = sampleSection.name.substring(0, 3);
        const searchResults = await api.functional.discussionBoard.admin.topics.index(adminConnection, {
            body: {
                search: searchTerm,
            } satisfies IDiscussionBoardSection.IRequest,
        });
        typia.assert(searchResults);
        TestValidator.predicate("search returns results", searchResults.data.length > 0);
        // Verify at least one result contains the search term
        const hasMatch = searchResults.data.some(section => section.name.includes(searchTerm) ||
            (section.description && section.description.includes(searchTerm)));
        TestValidator.predicate("search term matches section name or description", hasMatch);
    }
    // 4. Test sorting by creation date (newest first)
    const newestFirstResults = await api.functional.discussionBoard.admin.topics.index(adminConnection, {
        body: {
            sort: "created_at:desc",
        } satisfies IDiscussionBoardSection.IRequest,
    });
    typia.assert(newestFirstResults);
    // Verify ordering (if we have at least 2 sections)
    if (newestFirstResults.data.length >= 2) {
        const firstDate = new Date(newestFirstResults.data[0].created_at);
        const secondDate = new Date(newestFirstResults.data[1].created_at);
        TestValidator.predicate("newest first sorting works", firstDate >= secondDate);
    }
    // 5. Test sorting by creation date (oldest first)
    const oldestFirstResults = await api.functional.discussionBoard.admin.topics.index(adminConnection, {
        body: {
            sort: "created_at:asc",
        } satisfies IDiscussionBoardSection.IRequest,
    });
    typia.assert(oldestFirstResults);
    if (oldestFirstResults.data.length >= 2) {
        const firstDate = new Date(oldestFirstResults.data[0].created_at);
        const secondDate = new Date(oldestFirstResults.data[1].created_at);
        TestValidator.predicate("oldest first sorting works", firstDate <= secondDate);
    }
    // 6. Test sorting by name (alphabetical)
    const nameAscResults = await api.functional.discussionBoard.admin.topics.index(adminConnection, {
        body: {
            sort: "name:asc",
        } satisfies IDiscussionBoardSection.IRequest,
    });
    typia.assert(nameAscResults);
    if (nameAscResults.data.length >= 2) {
        const firstName = nameAscResults.data[0].name;
        const secondName = nameAscResults.data[1].name;
        TestValidator.predicate("name ascending sorting works", firstName <= secondName);
    }
    // 7. Test pagination
    const page1Results = await api.functional.discussionBoard.admin.topics.index(adminConnection, {
        body: {
            page: 1,
            limit: 3,
        } satisfies IDiscussionBoardSection.IRequest,
    });
    typia.assert(page1Results);
    TestValidator.equals("page 1 limit matches requested", page1Results.pagination.limit, 3);
    TestValidator.equals("page 1 current page is 1", page1Results.pagination.current, 1);
    // Get page 2 if there are enough results
    if (page1Results.pagination.pages >= 2) {
        const page2Results = await api.functional.discussionBoard.admin.topics.index(adminConnection, {
            body: {
                page: 2,
                limit: 3,
            } satisfies IDiscussionBoardSection.IRequest,
        });
        typia.assert(page2Results);
        TestValidator.equals("page 2 current page is 2", page2Results.pagination.current, 2);
        // Verify different data between pages
        const page1Ids = page1Results.data.map(section => section.id).sort();
        const page2Ids = page2Results.data.map(section => section.id).sort();
        // Check for no overlap (if pagination works correctly)
        const overlap = page1Ids.some(id => page2Ids.includes(id));
        TestValidator.predicate("pages should not have overlapping sections", !overlap || page1Results.pagination.records <= 3);
    }
    // 8. Test combined filtering: search + sorting
    if (initialResults.data.length > 0) {
        const sampleSection = RandomGenerator.pick(initialResults.data);
        // Ensure we have a non-empty name
        if (sampleSection.name && sampleSection.name.length > 0) {
            const charFromName = sampleSection.name.charAt(0);
            const combinedResults = await api.functional.discussionBoard.admin.topics.index(adminConnection, {
                body: {
                    search: charFromName,
                    sort: "created_at:desc",
                    limit: 5,
                } satisfies IDiscussionBoardSection.IRequest,
            });
            typia.assert(combinedResults);
            TestValidator.predicate("combined filter returns results", combinedResults.data.length > 0 || initialResults.pagination.records === 0);
        }
    }
    // 9. Validate evolution tracking capability
    // By sorting by creation date, administrators can see topic emergence patterns
    TestValidator.predicate("administrator can access section search endpoint", initialResults.pagination !== undefined);
}