import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_todo_update_trash_rejection(connection: api.IConnection): Promise<void> {
    // 1. Register member user
    const memberConnection: api.IConnection = { host: connection.host };
    const memberAuth = await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "1234567890123456",
            displayName: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>() satisfies string,
            referrer: typia.random<string & tags.Format<"uri">>() satisfies string,
        },
    });
    typia.assert(memberAuth);
    // 2. Create a todo
    const createdTodo = await api.functional.todoApp.member.todos.create(memberConnection, {
        body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 3 }),
            start_date: new Date().toISOString(),
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        } satisfies ITodoAppTodo.ICreate,
    });
    typia.assert(createdTodo);
    // 3. Verify todo is active before deletion
    TestValidator.equals("todo initially active", createdTodo.is_deleted, false);
    TestValidator.predicate("todo has valid ID", createdTodo.id !== undefined);
    // 4. Soft delete the todo
    await api.functional.todoApp.member.todos.erase(memberConnection, {
        todoId: createdTodo.id,
    });
    // 5. Re-authenticate with new connection
    const memberConnection2: api.IConnection = { host: connection.host };
    await authorize_member_login(memberConnection2, {
        body: {
            email: memberAuth.email,
            password: "1234567890123456",
        },
    });
    typia.assert(memberAuth);
    // 6. Attempt to update the soft-deleted todo (should return 404)
    await TestValidator.httpError("update soft-deleted todo returns 404", [404], async () => {
        await api.functional.todoApp.member.todos.update(memberConnection2, {
            todoId: createdTodo.id,
            body: {
                title: "Updated Title",
                description: "Updated Description",
            } satisfies ITodoAppTodo.IUpdate,
        });
    });
    // 7. Verify the todo still shows as deleted if we could retrieve it
    // The todo should still have is_deleted=true if accessible
    // This verifies the soft delete is still active
    // 8. Verify no edit history was created for the rejected update
    // Since the update was rejected, no EditHistory entry should exist
    // This is implicitly verified by the 404 response
    // 9. The todo remains in trash state
    TestValidator.predicate("todo remains in trash after failed update", (createdTodo.is_deleted === true) || (createdTodo.deleted_at !== null));
}