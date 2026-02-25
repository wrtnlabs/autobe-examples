import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
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

export async function test_api_user_profile_update_name_change_propagation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create primary user connection and register
  const primaryConnection: api.IConnection = { host: connection.host };
  const primaryUser = await authorize_user_join(primaryConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(primaryUser);
  // 2. Create todo to verify data consistency
  const todo = await api.functional.todoApp.user.todos.create(
    primaryConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Verify initial profile retrieval
  const initialProfile = await api.functional.todoApp.users.at(
    primaryConnection,
    {
      userId: primaryUser.id,
    },
  );
  typia.assert(initialProfile);
  TestValidator.equals(
    "initial display name matches",
    initialProfile.display_name,
    primaryUser.display_name,
  );
  // 4. Update display name
  const newDisplayName = RandomGenerator.name();
  const updatedProfile = await api.functional.todoApp.user.users.profile.update(
    primaryConnection,
    {
      body: {
        display_name: newDisplayName,
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // 5. Verify immediate propagation of display name change
  TestValidator.equals(
    "display name updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.notEquals(
    "display name changed",
    updatedProfile.display_name,
    primaryUser.display_name,
  );
  // 6. Verify todos remain unaffected
  const todoAfterUpdate = await api.functional.todoApp.user.todos.create(
    primaryConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoAfterUpdate);
  TestValidator.equals(
    "user ID in todo remains correct",
    todoAfterUpdate.user.id,
    primaryUser.id,
  );
  // 7. Verify profile retrieval shows updated name
  const retrievedProfile = await api.functional.todoApp.users.at(
    primaryConnection,
    {
      userId: primaryUser.id,
    },
  );
  typia.assert(retrievedProfile);
  TestValidator.equals(
    "retrieved profile shows updated name",
    retrievedProfile.display_name,
    newDisplayName,
  );
  // 8. Create secondary user to test privacy
  const secondaryConnection: api.IConnection = { host: connection.host };
  const secondaryUser = await authorize_user_join(secondaryConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(secondaryUser);
  // 9. Verify privacy - secondary user cannot access primary user's profile
  await TestValidator.error(
    "secondary user cannot access primary user profile",
    async () => {
      await api.functional.todoApp.users.at(secondaryConnection, {
        userId: primaryUser.id,
      });
    },
  );
  // 10. Verify data isolation - profiles should be different
  const secondaryProfile = await api.functional.todoApp.users.at(
    secondaryConnection,
    {
      userId: secondaryUser.id,
    },
  );
  typia.assert(secondaryProfile);
  TestValidator.notEquals(
    "user IDs are different",
    primaryUser.id,
    secondaryUser.id,
  );
  TestValidator.notEquals(
    "display names are isolated",
    retrievedProfile.display_name,
    secondaryProfile.display_name,
  );
}
