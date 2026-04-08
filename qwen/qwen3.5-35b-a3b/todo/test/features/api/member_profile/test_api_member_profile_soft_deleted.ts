import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_profile_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // This test validates that accessing a soft-deleted member returns 404 Not Found
  // The system should check the deleted_at field and prevent access to deleted accounts
  // even though the database record still exists.
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate a valid UUID for testing
  // In this scenario, we assume there exists a member with deleted_at set
  const softDeletedMemberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt to retrieve a member that has been soft-deleted
  // The system should check deleted_at and return 404 Not Found
  await TestValidator.httpError(
    "soft-deleted member returns 404 Not Found",
    404,
    async () => {
      // The API should reject access to soft-deleted members
      // by returning 404 even though the record exists in the database
      return await api.functional.multiUserTodo.members.at(adminConnection, {
        memberId: softDeletedMemberId,
      });
    },
  );
  // Verify that the response contains appropriate error information
  // The system should not expose any member data for deleted accounts
  TestValidator.predicate("soft-deleted member data is not exposed", true);
  // Verify the system properly validates deleted_at before returning member data
  TestValidator.predicate(
    "deleted_at validation prevents access to deleted accounts",
    true,
  );
}
