import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_profile_non_existent(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID that doesn't exist in the database
  const nonExistentMemberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt to retrieve non-existent member
  // Expected: HTTP 404 Not Found (after auth validation)
  await TestValidator.httpError(
    "should return 404 for non-existent member",
    404,
    async () =>
      await api.functional.multiUserTodo.members.at(connection, {
        memberId: nonExistentMemberId,
      }),
  );
}
