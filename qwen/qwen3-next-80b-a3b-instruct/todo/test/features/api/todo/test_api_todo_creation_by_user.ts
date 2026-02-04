import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_todo_creation_by_user(connection: api.IConnection): Promise<void> {
    // Step 1: Create a new connection and authenticate user using utility function
    const userConnection: api.IConnection = { host: connection.host };
    const user: ITodoAppUser.IAuthorized = await authorize_user_join(userConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
        } satisfies ITodoAppUser.IJoin,
    });
    typia.assert(user);
    // Step 2: Create a todo item with required title and optional fields
    const todo: ITodoAppTodo = await api.functional.todoApp.user.todos.create(userConnection, {
        body: {
            title: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 15 }),
            description: typia.random<string & tags.MaxLength<2000>>(),
            start_date: typia.random<string & tags.Format<"date-time">>(),
            due_date: typia.random<string & tags.Format<"date-time">>(),
        } satisfies ITodoAppTodo.ICreate,
    });
    typia.assert(todo);
    // Step 3: Validate the created todo meets all schema requirements
    // Validate title is non-empty and within 1-200 character limit
    TestValidator.predicate("title is at least 1 character long", todo.title.length >= 1);
    TestValidator.predicate("title is no more than 200 characters", todo.title.length <= 200);
    // Validate completion_status is initialized to false (business rule)
    TestValidator.equals("completion status initialized to false", todo.completion_status, false);
    // Validate is_deleted is initialized to false (business rule)
    TestValidator.equals("is_deleted initialized to false", todo.is_deleted, false);
    // Validate created_at and updated_at are valid date-time format
    // Note: typia.assert(todo) already validates these, but we validate they're strings
    TestValidator.predicate("created_at is a string", typeof todo.created_at === "string");
    TestValidator.predicate("updated_at is a string", typeof todo.updated_at === "string");
    // Validate id is not empty
    TestValidator.predicate("id is not empty", todo.id.length > 0);
    // Validate optional description is either undefined or string <= 2000 characters
    if (todo.description !== undefined) {
        TestValidator.predicate("description is within 2000 character limit", todo.description.length <= 2000);
    }
    // Validate optional start_date and due_date are either undefined or valid date-time strings
    if (todo.start_date !== undefined) {
        typia.assertGuard<string & tags.Format<"date-time">>(todo.start_date);
    }
    if (todo.due_date !== undefined) {
        typia.assertGuard<string & tags.Format<"date-time">>(todo.due_date);
    }
}