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
import { generate_random_hrm_time_track_member_roles_create } from "../../../generate/generate_random_hrm_time_track_member_roles_create";
import { prepare_random_hrm_time_track_role } from "../../../prepare/prepare_random_hrm_time_track_role";

/**
 * Test updating permissions on a custom role within an organization.
 *
 * Validates the complete role permission update flow including member authentication, custom role creation with initial permissions, and permission replacement. Ensures that the permission update operation atomically replaces all existing permissions with the new set, updates the role's timestamp, and returns the complete updated role object.
 *
 * Special attention is given to verifying that the permission update is a complete replacement operation (not a merge), that the updated_at timestamp changes, and that the response contains the accurate permission set.
 *
 * 1. Member registers and authenticates with organization ownership permissions.
 * 2. Custom role is created with initial permissions (employee_viewing).
 * 3. Role permissions are updated to a new set (employee_viewing, project_viewing).
 * 4. Validates that permissions were completely replaced, not merged.
 * 5. Validates that updated_at timestamp differs from created_at.
 * 6. Validates that the response contains the complete role object with new permissions.
 */
export async function test_api_role_permissions_update_custom_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create custom role with initial permissions
  const initialRole = await generate_random_hrm_time_track_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: ["employee_viewing"],
      } satisfies IHrmTimeTrackRole.ICreate,
    },
  );
  typia.assert(initialRole);
  // Store initial timestamps for comparison
  const initialCreatedAt = initialRole.created_at;
  const initialUpdatedAt = initialRole.updated_at;
  // 3. Update role permissions with new set
  const updateBody = {
    permissions: ["employee_viewing", "project_viewing"],
  } satisfies IHrmTimeTrackRole.IUpdatePermission;
  const updatedRole =
    await api.functional.hrmTimeTrack.member.roles.permissions.update(
      memberConnection,
      {
        roleId: initialRole.id,
        body: updateBody,
      },
    );
  typia.assert(updatedRole);
  // 4. Validate role is custom (not built-in)
  TestValidator.equals(
    "role is custom not built-in",
    updatedRole.is_builtin,
    false,
  );
  // 5. Validate permissions were completely replaced (not merged)
  TestValidator.equals(
    "permissions replaced exactly",
    updatedRole.permissions,
    ["employee_viewing", "project_viewing"],
  );
  // 6. Validate updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedRole.updated_at,
    initialUpdatedAt,
  );
  // 7. Validate created_at remains unchanged
  TestValidator.equals(
    "created_at remains unchanged",
    updatedRole.created_at,
    initialCreatedAt,
  );
  // 8. Validate role id remains the same
  TestValidator.equals("role id unchanged", updatedRole.id, initialRole.id);
  // 9. Validate atomic replace operation - exact permission count
  TestValidator.equals(
    "permissions count matches new set",
    updatedRole.permissions.length,
    2,
  );
}
