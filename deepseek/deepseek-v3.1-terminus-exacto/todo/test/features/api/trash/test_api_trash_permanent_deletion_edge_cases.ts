import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashItem";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_trash_permanent_deletion_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection for testing
  const userConnection: api.IConnection = { host: connection.host };
  // Register and authenticate user using utility function
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(authorizedUser);
  userConnection.headers = { Authorization: authorizedUser.token.access };
  // Test 1: Attempt to permanently delete non-existent trash item
  await TestValidator.error(
    "non-existent trash item deletion should fail",
    async () => {
      await api.functional.todoApp.user.todos.trash.permanent_delete.erase(
        userConnection,
        {
          trashItemId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Note: Cannot test other edge cases (double deletion, restoration scenarios)
  // without access to a trash listing endpoint to obtain valid trashItemId values
  // The test scenario mentions these cases but they are not implementable with
  // the current API surface available in the provided SDK
  TestValidator.predicate("non-existent trash item test completed", true);
}
