import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_profile_retrieval_nonexistent_userid(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that requesting a user profile with a non-existent userId yields a 404 HTTP error.
  const baseConnection: api.IConnection = { host: connection.host };
  // Use a random valid UUID that presumably does not exist in the system
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should throw 404 Not Found when userId does not exist",
    404,
    async () => {
      await api.functional.multiUserTodo.users.at(baseConnection, {
        userId: nonExistentUserId,
      });
    },
  );
}
