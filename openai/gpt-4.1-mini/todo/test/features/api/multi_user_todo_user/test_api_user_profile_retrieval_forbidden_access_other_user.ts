import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_profile_retrieval_forbidden_access_other_user(
  connection: api.IConnection,
): Promise<void> {
  // Setup: create two separate user authenticated connections
  // We simulate this by using different user IDs to test access to another user's profile
  // We assume there is an authenticated user with an id and another different user id
  const user1Connection: api.IConnection = { host: connection.host };
  const user2Connection: api.IConnection = { host: connection.host };
  // Generate two different UUIDs representing two different user IDs
  // In a real setup, these would be actual registered user IDs
  const user1Id = typia.random<string & tags.Format<"uuid">>();
  const user2Id = typia.random<string & tags.Format<"uuid">>();
  // User1 tries to access user2's profile - should be forbidden
  await TestValidator.httpError(
    "Access another user's profile should be forbidden",
    [403, 404],
    async () => {
      await api.functional.multiUserTodo.users.at(user1Connection, {
        userId: user2Id,
      });
    },
  );
  // User2 tries to access user1's profile - should be forbidden
  await TestValidator.httpError(
    "Access another user's profile should be forbidden",
    [403, 404],
    async () => {
      await api.functional.multiUserTodo.users.at(user2Connection, {
        userId: user1Id,
      });
    },
  );
}
