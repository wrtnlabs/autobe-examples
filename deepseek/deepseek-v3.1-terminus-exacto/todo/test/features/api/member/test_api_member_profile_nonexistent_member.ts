import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_profile_nonexistent_member(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate a valid UUID that does not correspond to any registered member
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent member profile and validate HTTP 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent member",
    404,
    async () => {
      await api.functional.multiUserTodo.members.at(memberConnection, {
        memberId: nonExistentMemberId,
      });
    },
  );
}
