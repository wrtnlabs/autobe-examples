import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_profile_retrieval_self_access(
  connection: api.IConnection,
): Promise<void> {
  // Generate two distinct user IDs
  const user1Id = typia.random<string & tags.Format<"uuid">>();
  const user2Id = typia.random<string & tags.Format<"uuid">>();
  // Attempt to fetch user1's profile without authentication (using base connection)
  await TestValidator.httpError(
    "unauthenticated request rejected",
    401,
    async () => {
      await api.functional.multiUserTodo.users.at(connection, {
        userId: user1Id,
      });
    },
  );
  // Using separate connections to represent two different users
  const user1Connection: api.IConnection = { host: connection.host };
  const user2Connection: api.IConnection = { host: connection.host };
  // Attempt to fetch user1's profile by user1 - expect 404 or forbidden due to no authentication utility
  await TestValidator.error(
    "user1 cannot access user1's profile without authentication",
    async () => {
      await api.functional.multiUserTodo.users.at(user1Connection, {
        userId: user1Id,
      });
    },
  );
  // Attempt to fetch user1's profile by user2
  await TestValidator.error("user2 cannot access user1's profile", async () => {
    await api.functional.multiUserTodo.users.at(user2Connection, {
      userId: user1Id,
    });
  });
  // Attempt to fetch user2's profile by user1
  await TestValidator.error("user1 cannot access user2's profile", async () => {
    await api.functional.multiUserTodo.users.at(user1Connection, {
      userId: user2Id,
    });
  });
}
