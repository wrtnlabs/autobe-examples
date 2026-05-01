import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_password_resets_create } from "../../../generate/generate_random_todo_app_password_resets_create";
import { prepare_random_todo_app_member_password_reset } from "../../../prepare/prepare_random_todo_app_member_password_reset";

/**
 * Test retrieving a password reset record scoped to the authenticated member.
 *
 * Validates that a member can retrieve the full details of their own password
 * reset record after initiating a password reset request. The test ensures the
 * response includes all expected fields and confirms the record is correctly
 * scoped to the authenticated member through ownership verification.
 *
 * 1. A member joins via the registration endpoint to establish an authenticated
 *    session with a unique email address.
 * 2. The member initiates a password reset by providing their registered email
 *    address, which creates a reset record in the system.
 * 3. The member retrieves the password reset record details using the reset
 *    identifier via the scoped member endpoint.
 * 4. Validates the response structure contains all expected fields: id,
 *    todo_app_member_id, token, expired_at, created_at, and updated_at.
 * 5. Confirms the todo_app_member_id matches the authenticated member's ID,
 *    verifying that record ownership is correctly enforced and cross-member
 *    access is prevented.
 */
export async function test_api_password_reset_retrieve_own_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member to establish an authenticated session
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Initiate a password reset for the member's email
  await generate_random_todo_app_password_resets_create(memberConnection, {
    body: { email: member.email },
  });
  // 3. Retrieve the password reset record by reset identifier
  const reset = await api.functional.todoApp.member.password_resets.at(
    memberConnection,
    { resetId: typia.random<string & tags.Format<"uuid">>() },
  );
  typia.assert(reset);
  // 4. Validate record ownership and field completeness
  TestValidator.equals(
    "todo_app_member_id matches authenticated member",
    reset.todo_app_member_id,
    member.id,
  );
  TestValidator.predicate(
    "token is present and non-empty",
    reset.token.length > 0,
  );
  TestValidator.predicate(
    "expired_at is a valid datetime",
    !isNaN(Date.parse(reset.expired_at)),
  );
  TestValidator.predicate(
    "created_at is a valid datetime",
    !isNaN(Date.parse(reset.created_at)),
  );
  TestValidator.predicate(
    "updated_at is a valid datetime",
    !isNaN(Date.parse(reset.updated_at)),
  );
}
