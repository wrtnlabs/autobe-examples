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
 * Test retrieving a custom role by its unique identifier, including its assigned permissions.
 *
 * Validates the role retrieval endpoint by authenticating as a member and fetching a custom role definition. Ensures that the response contains all required fields including role metadata, built-in status flag, timestamps, and the permissions array.
 *
 * Special attention is given to verifying that custom roles have is_builtin set to false, active roles have deleted_at as null, and the permissions array contains valid permission codes assigned to the role.
 *
 * 1. Authenticate as a member using authorize_member_join utility function.
 * 2. Generate a random UUID to simulate an existing custom role ID.
 * 3. Call GET /hrmTimeTrack/member/roles/{roleId} with the role ID.
 * 4. Validate response structure using typia.assert() for complete type checking.
 * 5. Verify business logic: is_builtin is false, deleted_at is null, permissions array exists.
 */
export async function test_api_role_retrieve_custom_role_with_permissions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Generate role ID for retrieval
  const roleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the custom role
  const role: IHrmTimeTrackRole =
    await api.functional.hrmTimeTrack.member.roles.at(memberConnection, {
      roleId,
    });
  typia.assert(role);
  // 4. Validate custom role properties
  TestValidator.predicate(
    "is custom role (not built-in)",
    role.is_builtin === false,
  );
  TestValidator.predicate(
    "role is active (not deleted)",
    role.deleted_at === null,
  );
  TestValidator.predicate("has role name", role.name.length > 0);
  TestValidator.predicate(
    "has permissions array",
    Array.isArray(role.permissions),
  );
  TestValidator.predicate(
    "has valid created_at timestamp",
    role.created_at.length > 0,
  );
  TestValidator.predicate(
    "has valid updated_at timestamp",
    role.updated_at.length > 0,
  );
}
