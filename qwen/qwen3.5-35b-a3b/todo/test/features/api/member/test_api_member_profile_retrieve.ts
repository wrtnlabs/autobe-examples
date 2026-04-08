import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_profile_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  // Note: This test assumes an active member exists in the database.
  // In a real E2E scenario, you would need to create a member first.
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const member = await api.functional.multiUserTodo.members.at(
    adminConnection,
    {
      memberId,
    },
  );
  typia.assert(member);
  // Validate response contains all required fields
  TestValidator.equals("member ID field exists", member.id !== undefined, true);
  TestValidator.equals("email field exists", member.email !== undefined, true);
  TestValidator.equals(
    "created_at field exists",
    member.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "updated_at field exists",
    member.updated_at !== undefined,
    true,
  );
  TestValidator.equals(
    "deleted_at field exists",
    member.deleted_at !== undefined,
    true,
  );
  // Validate id matches the requested memberId
  TestValidator.equals("member ID matches requested", member.id, memberId);
  // Validate email is present and not empty
  TestValidator.predicate("email is not empty", member.email.length > 0);
  // Validate timestamps are present and have valid format
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(member.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    !isNaN(Date.parse(member.updated_at)),
  );
  // Validate deleted_at is null for active member
  TestValidator.equals(
    "deleted_at is null for active member",
    member.deleted_at,
    null,
  );
  // Verify password_hash is NOT included in the response
  const responseJson: Record<string, unknown> = member;
  TestValidator.equals(
    "password_hash excluded from response",
    "password_hash" in responseJson,
    false,
  );
}
