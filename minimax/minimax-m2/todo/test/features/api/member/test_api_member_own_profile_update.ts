import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";

export async function test_api_member_own_profile_update(
  connection: api.IConnection,
) {
  // Step 1: Register a new member to establish authentication context
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const initialMember: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: {
        email: memberEmail,
        first_name: "John",
        last_name: "Doe",
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(initialMember);

  // Step 2: Create a member profile in the TodoApp system
  const createdMember: ITodoAppMember =
    await api.functional.todoApp.member.members.create(connection, {
      body: {
        email: memberEmail,
        first_name: "John",
        last_name: "Doe",
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(createdMember);

  // Step 3: Update the member's own profile information
  const updatedMember: ITodoAppMember =
    await api.functional.todoApp.member.members.update(connection, {
      memberId: createdMember.id,
      body: {
        first_name: "Johnny",
        last_name: "Smith",
        status: "active",
      } satisfies ITodoAppMember.IUpdate,
    });
  typia.assert(updatedMember);

  // Step 4: Validate the profile update
  TestValidator.equals(
    "member ID should remain the same",
    updatedMember.id,
    createdMember.id,
  );
  TestValidator.equals(
    "first name should be updated",
    updatedMember.first_name,
    "Johnny",
  );
  TestValidator.equals(
    "last name should be updated",
    updatedMember.last_name,
    "Smith",
  );
  TestValidator.equals(
    "email should remain the same",
    updatedMember.email,
    createdMember.email,
  );
  TestValidator.equals(
    "status should remain active",
    updatedMember.status,
    "active",
  );
  TestValidator.predicate(
    "updated timestamp should be newer",
    updatedMember.updated_at > createdMember.updated_at,
  );
}
