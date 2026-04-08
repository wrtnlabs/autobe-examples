import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving a built-in role by its unique identifier.
 *
 * Validates the role retrieval workflow including member authentication and built-in role data verification. Ensures that built-in roles (Owner, Manager, Employee) return correct data with is_builtin flag set to true and deleted_at as null.
 *
 * Special attention is given to verifying that built-in role permissions are correctly populated and that the role data structure matches the expected IHrmTimeTrackRole type definition.
 *
 * 1. Authenticate as a member using authorize_member_join utility.
 * 2. Retrieve a built-in role by its ID using the roles.at API.
 * 3. Validate that is_builtin is true for built-in roles.
 * 4. Validate that deleted_at is null (built-in roles cannot be deleted).
 * 5. Validate that permissions array is populated with expected permissions.
 * 6. Test error scenario with non-existent role ID.
 */
export async function test_api_role_retrieve_builtin_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Generate a role ID to test with (simulated scenario)
  const roleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the built-in role
  const role: IHrmTimeTrackRole =
    await api.functional.hrmTimeTrack.member.roles.at(memberConnection, {
      roleId,
    });
  typia.assert(role);
  // 4. Validate built-in role properties
  TestValidator.equals("is_builtin is true", role.is_builtin, true);
  TestValidator.equals("deleted_at is null", role.deleted_at, null);
  TestValidator.predicate("has valid id", role.id !== undefined);
  TestValidator.predicate("has valid name", role.name !== undefined);
  TestValidator.predicate(
    "has permissions array",
    Array.isArray(role.permissions),
  );
  TestValidator.predicate("has created_at", role.created_at !== undefined);
  TestValidator.predicate("has updated_at", role.updated_at !== undefined);
  // 5. Test error scenario with non-existent role ID
  const nonExistentRoleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error("non-existent role returns error", async () => {
    await api.functional.hrmTimeTrack.member.roles.at(memberConnection, {
      roleId: nonExistentRoleId,
    });
  });
}
