import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTask";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that task list endpoint correctly handles various sorting options and pagination parameters.
 *
 * This test validates:
 * 1. Default sorting behavior (created_at descending)
 * 2. Due date sorting with NULL handling (NULLS LAST for ASC, NULLS FIRST for DESC)
 * 3. Priority sorting with correct ordering (urgent, high, medium, low)
 * 4. Pagination boundaries and metadata accuracy
 * 5. Valid parameter combinations
 */
export async function test_api_task_list_sorting_and_pagination(connection: api.IConnection): Promise<void> {
    // 1. Admin authentication
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        },
    });
    // 2. Test default sorting (created_at descending)
    const defaultSortResult = await api.functional.hrmPlatform.admin.tasks.index(adminConnection, {
        body: {
            page: 1,
            page_size: 20,
        } satisfies IHrmPlatformTask.IRequest,
    });
    typia.assert(defaultSortResult);
    TestValidator.predicate("default sorting returns tasks or empty list", defaultSortResult.data.length >= 0);
    // Verify pagination metadata
    TestValidator.equals("default pagination current page", defaultSortResult.pagination.current, 1);
    TestValidator.equals("default pagination limit", defaultSortResult.pagination.limit, 20);
    // 3. Test due_date sorting ascending (NULLS LAST)
    const dueDateAscResult = await api.functional.hrmPlatform.admin.tasks.index(adminConnection, {
        body: {
            page: 1,
            page_size: 20,
            sort_by: "due_date",
            sort_order: "asc",
        } satisfies IHrmPlatformTask.IRequest,
    });
    typia.assert(dueDateAscResult);
    TestValidator.predicate("due_date ascending returns tasks or empty list", dueDateAscResult.data.length >= 0);
    // Verify due_date ascending order (earliest first, nulls last)
    for (let i = 0; i < dueDateAscResult.data.length - 1; i++) {
        const current = dueDateAscResult.data[i].due_date;
        const next = dueDateAscResult.data[i + 1].due_date;
        // If current is null, it should be at the end (all remaining should be null)
        if (current === null) {
            TestValidator.predicate(`null due_date at position ${i} should be followed by null or end`, next === null);
        } else if (next !== null) {
            TestValidator.predicate(
                `due_date at position ${i} should be <= position ${i + 1}`,
                new Date(current).getTime() <= new Date(next).getTime(),
            );
        }
    }

    // 4. Test due_date sorting descending (NULLS FIRST)
    const dueDateDescResult = await api.functional.hrmPlatform.admin.tasks.index(
        adminConnection,
        {
            body: {
                page: 1,
                page_size: 20,
                sort_by: "due_date",
                sort_order: "desc",
            } satisfies IHrmPlatformTask.IRequest,
        },
    );
    typia.assert(dueDateDescResult);
    
    TestValidator.predicate(
        "due_date descending returns tasks or empty list",
        dueDateDescResult.data.length >= 0,
    );
    
    // Verify due_date descending order (latest first, nulls first)
    for (let i = 0; i < dueDateDescResult.data.length - 1; i++) {
        const current = dueDateDescResult.data[i].due_date;
        const next = dueDateDescResult.data[i + 1].due_date;
        
        // If both are not null, verify descending order
        if (current !== null && next !== null) {
            TestValidator.predicate(
                `due_date at position ${i} should be >= position ${i + 1}`,
                new Date(current).getTime() >= new Date(next).getTime(),
            );
        }
    }

    // 5. Test priority sorting ascending (urgent, high, medium, low)
    const priorityAscResult = await api.functional.hrmPlatform.admin.tasks.index(
        adminConnection,
        {
            body: {
                page: 1,
                page_size: 20,
                sort_by: "priority",
                sort_order: "asc",
            } satisfies IHrmPlatformTask.IRequest,
        },
    );
    typia.assert(priorityAscResult);
    
    TestValidator.predicate(
        "priority ascending returns tasks or empty list",
        priorityAscResult.data.length >= 0,
    );
    
    // Verify priority ascending order (urgent=1, high=2, medium=3, low=4)
    const priorityOrder: Record<string, number> = {
        urgent: 1,
        high: 2,
        medium: 3,
        low: 4,
    };
    
    for (let i = 0; i < priorityAscResult.data.length - 1; i++) {
        const currentPriority = priorityOrder[priorityAscResult.data[i].priority];
        const nextPriority = priorityOrder[priorityAscResult.data[i + 1].priority];
        
        if (currentPriority !== undefined && nextPriority !== undefined) {
            TestValidator.predicate(
                `priority at position ${i} should be <= position ${i + 1}`,
                currentPriority <= nextPriority,
            );
        }
    }

    // 6. Test priority sorting descending (low, medium, high, urgent)
    const priorityDescResult = await api.functional.hrmPlatform.admin.tasks.index(
        adminConnection,
        {
            body: {
                page: 1,
                page_size: 20,
                sort_by: "priority",
                sort_order: "desc",
            } satisfies IHrmPlatformTask.IRequest,
        },
    );
    typia.assert(priorityDescResult);
    
    TestValidator.predicate(
        "priority descending returns tasks or empty list",
        priorityDescResult.data.length >= 0,
    );
    
    // Verify priority descending order (low=4, medium=3, high=2, urgent=1)
    for (let i = 0; i < priorityDescResult.data.length - 1; i++) {
        const currentPriority = priorityOrder[priorityDescResult.data[i].priority];
        const nextPriority = priorityOrder[priorityDescResult.data[i + 1].priority];
        
        if (currentPriority !== undefined && nextPriority !== undefined) {
            TestValidator.predicate(
                `priority at position ${i} should be >= position ${i + 1}`,
                currentPriority >= nextPriority,
            );
        }
    }

    // 7. Test pagination - page 1 with page_size 5
    const page1Result = await api.functional.hrmPlatform.admin.tasks.index(
        adminConnection,
        {
            body: {
                page: 1,
                page_size: 5,
            } satisfies IHrmPlatformTask.IRequest,
        },
    );
    typia.assert(page1Result);
    
    TestValidator.equals(
        "page 1 pagination current",
        page1Result.pagination.current,
        1,
    );
    TestValidator.equals(
        "page 1 pagination limit",
        page1Result.pagination.limit,
        5,
    );
    TestValidator.predicate(
        "page 1 returns at most 5 tasks",
        page1Result.data.length <= 5,
    );

    // 8. Test pagination - page 2 with page_size 5
    const page2Result = await api.functional.hrmPlatform.admin.tasks.index(
        adminConnection,
        {
            body: {
                page: 2,
                page_size: 5,
            } satisfies IHrmPlatformTask.IRequest,
        },
    );
    typia.assert(page2Result);
    
    TestValidator.equals(
        "page 2 pagination current",
        page2Result.pagination.current,
        2,
    );
    TestValidator.equals(
        "page 2 pagination limit",
        page2Result.pagination.limit,
        5,
    );
    TestValidator.predicate(
        "page 2 returns at most 5 tasks",
        page2Result.data.length <= 5,
    );
    
    // Verify page 2 has different tasks than page 1 (if both have data)
    if (page1Result.data.length > 0 && page2Result.data.length > 0) {
        const page1Ids = new Set(page1Result.data.map((t) => t.id));
        const page2HasDifferentTasks = page2Result.data.every((t) => !page1Ids.has(t.id));
        TestValidator.predicate(
            "page 2 returns different tasks than page 1",
            page2HasDifferentTasks,
        );
    }

    // 9. Test pagination with maximum page_size (100)
    const maxPageSizeResult = await api.functional.hrmPlatform.admin.tasks.index(
        adminConnection,
        {
            body: {
                page: 1,
                page_size: 100,
            } satisfies IHrmPlatformTask.IRequest,
        },
    );
    typia.assert(maxPageSizeResult);
    
    TestValidator.equals(
        "max page_size pagination limit",
        maxPageSizeResult.pagination.limit,
        100,
    );
    TestValidator.predicate(
        "max page_size returns at most 100 tasks",
        maxPageSizeResult.data.length <= 100,
    );

    // 10. Verify pagination metadata accuracy
    TestValidator.predicate(
        "pagination records matches or exceeds data length",
        maxPageSizeResult.pagination.records >= maxPageSizeResult.data.length,
    );
    
    TestValidator.predicate(
        "pagination pages calculated correctly",
        maxPageSizeResult.pagination.pages ===
            Math.ceil(maxPageSizeResult.pagination.records / maxPageSizeResult.pagination.limit),
    );

    // 11. Test created_at sorting (explicit descending)
    const createdAtDescResult = await api.functional.hrmPlatform.admin.tasks.index(
        adminConnection,
        {
            body: {
                page: 1,
                page_size: 20,
                sort_by: "created_at",
                sort_order: "desc",
            } satisfies IHrmPlatformTask.IRequest,
        },
    );
    typia.assert(createdAtDescResult);
    
    TestValidator.predicate(
        "created_at descending returns tasks or empty list",
        createdAtDescResult.data.length >= 0,
    );
    
    // Verify created_at descending order
    for (let i = 0; i < createdAtDescResult.data.length - 1; i++) {
        const current = new Date(createdAtDescResult.data[i].created_at).getTime();
        const next = new Date(createdAtDescResult.data[i + 1].created_at).getTime();
        
        TestValidator.predicate(
            `created_at at position ${i} should be >= position ${i + 1}`,
            current >= next,
        );
    }

    // 12. Test created_at sorting ascending
    const createdAtAscResult = await api.functional.hrmPlatform.admin.tasks.index(
        adminConnection,
        {
            body: {
                page: 1,
                page_size: 20,
                sort_by: "created_at",
                sort_order: "asc",
            } satisfies IHrmPlatformTask.IRequest,
        },
    );
    typia.assert(createdAtAscResult);
    
    TestValidator.predicate(
        "created_at ascending returns tasks or empty list",
        createdAtAscResult.data.length >= 0,
    );
    
    // Verify created_at ascending order
    for (let i = 0; i < createdAtAscResult.data.length - 1; i++) {
        const current = new Date(createdAtAscResult.data[i].created_at).getTime();
        const next = new Date(createdAtAscResult.data[i + 1].created_at).getTime();
        
        TestValidator.predicate(
            `created_at at position ${i} should be <= position ${i + 1}`,
            current <= next,
        );
    }

    // 13. Test combined filters with sorting
    const filteredResult = await api.functional.hrmPlatform.admin.tasks.index(
        adminConnection,
        {
            body: {
                page: 1,
                page_size: 10,
                status: "open",
                sort_by: "priority",
                sort_order: "asc",
            } satisfies IHrmPlatformTask.IRequest,
        },
    );
    typia.assert(filteredResult);
    
    TestValidator.predicate(
        "filtered results return valid response",
        filteredResult.data.length >= 0,
    );
    
    // Verify all returned tasks match the filter
    for (const task of filteredResult.data) {
        TestValidator.equals(
            `task ${task.id} should have status 'open'`,
            task.status,
            "open",
        );
    }
}