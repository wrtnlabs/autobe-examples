import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IMultiUserTodoEditHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistorySnapshot";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoEditHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoEditHistorySnapshot";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Successful paginated retrieval of edit history snapshots for an edited todo.
 * 
 * 1. Authenticate as member via join utility function
 * 2. Create a todo with title and description
 * 3. Make multiple edits to generate edit history snapshots
 * 4. Retrieve paginated edit history snapshots
 * 5. Validate pagination metadata and snapshot content
 * 6. Test pagination with different page/limit parameters
 */

export async function test_api_edit_history_snapshot_basic_pagination(connection: api.IConnection): Promise<void> {
    // 1. Authenticate as member
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IMultiUserTodoMember.IJoin,
    });
    typia.assert(member);
    
    // 2. Create a todo
    const todo = await generate_random_multi_user_todo_member_todos_create(memberConnection, {
        body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IMultiUserTodoTodo.ICreate,
    });
    typia.assert(todo);
    
    // 3. Make multiple edits to generate edit history snapshots
    // First edit: Update title
    const firstEdit = await api.functional.multiUserTodo.member.todos.update(memberConnection, {
        todoId: todo.id,
        body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMultiUserTodoTodo.IUpdate,
    });
    typia.assert(firstEdit);
    
    // Second edit: Toggle completion status (creates snapshot)
    const secondEdit = await api.functional.multiUserTodo.member.todos.completion_statuses.toggleCompletionStatus(memberConnection, {
        todoId: todo.id,
        body: {} satisfies IMultiUserTodoTodo.ICompletionStatus,
    });
    typia.assert(secondEdit);
    
    // Third edit: Update description and dates
    const thirdEdit = await api.functional.multiUserTodo.member.todos.update(memberConnection, {
        todoId: todo.id,
        body: {
            description: RandomGenerator.paragraph({ sentences: 4 }),
            start_date: new Date().toISOString(),
            due_date: new Date(Date.now() + 86400000).toISOString(),
        } satisfies IMultiUserTodoTodo.IUpdate,
    });
    typia.assert(thirdEdit);
    
    // 4. Retrieve edit history snapshots with pagination (page 1, limit 10)
    const firstPage = await api.functional.multiUserTodo.member.todos.edit_history_snapshots.index(memberConnection, {
        todoId: todo.id,
        body: {
            page: 1,
            limit: 10,
        } satisfies IMultiUserTodoEditHistorySnapshot.IRequest,
    });
    typia.assert(firstPage);
    
    // 5. Validate pagination metadata
    TestValidator.equals("page should be 1", firstPage.pagination.current, 1 satisfies number);
    TestValidator.equals("limit should be 10", firstPage.pagination.limit, 10 satisfies number);
    TestValidator.predicate("should have at least 3 snapshots", firstPage.pagination.records >= 3);
    TestValidator.predicate("data array length matches limit or total records", firstPage.data.length === Math.min(firstPage.pagination.records, 10));
    
    // Validate individual snapshot fields
    for (const snapshot of firstPage.data) {
        typia.assert(snapshot);
        TestValidator.predicate("snapshot has title", snapshot.title.length > 0);
        // typia.assert() already validates createdAt format, no need for redundant check
    }
    
    // 6. Verify snapshots are sorted by created_at descending
    for (let i = 0; i < firstPage.data.length - 1; i++) {
        const current = new Date(firstPage.data[i].createdAt).getTime();
        const next = new Date(firstPage.data[i + 1].createdAt).getTime();
        TestValidator.predicate(`snapshot ${i} should be more recent than ${i + 1}`, current >= next);
    }
    
    // 7. Test pagination with different parameters
    if (firstPage.pagination.records > 1) {
        const secondPage = await api.functional.multiUserTodo.member.todos.edit_history_snapshots.index(memberConnection, {
            todoId: todo.id,
            body: {
                page: 2,
                limit: 1,
            } satisfies IMultiUserTodoEditHistorySnapshot.IRequest,
        });
        typia.assert(secondPage);
        TestValidator.equals("second page should be page 2", secondPage.pagination.current, 2 satisfies number);
        TestValidator.equals("second page limit should be 1", secondPage.pagination.limit, 1 satisfies number);
        TestValidator.predicate("second page should have data", secondPage.data.length > 0);
        
        // Verify first snapshot of first page is different from second page snapshot
        if (firstPage.data.length > 0 && secondPage.data.length > 0) {
            TestValidator.notEquals("first page snapshot should differ from second page snapshot", firstPage.data[0].id, secondPage.data[0].id);
        }
    }
    
    // 8. Test edge case: no date filters (should return all snapshots)
    const allSnapshots = await api.functional.multiUserTodo.member.todos.edit_history_snapshots.index(memberConnection, {
        todoId: todo.id,
        body: {} satisfies IMultiUserTodoEditHistorySnapshot.IRequest,
    });
    typia.assert(allSnapshots);
    TestValidator.equals("total records should match without filters", allSnapshots.pagination.records, firstPage.pagination.records);
}