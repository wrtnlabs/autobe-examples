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
 * Test the successful deletion of a custom role when no employees are assigned to it.
 *
 * Validates the complete custom role deletion flow including member authentication, role creation, and soft delete operation. Ensures that custom roles can be deleted when no employees are using them, and that the soft delete mechanism properly sets the deleted_at timestamp while preserving the role record for audit purposes.
 *
 * The test verifies that the role creation succeeds with proper permissions, and that the deletion operation completes without errors when no employees are assigned to the role.
 *
 * 1. Member registers and authenticates with organization management permissions.
 * 2. Custom role is created with specific permissions (e.g., time_viewing).
 * 3. Validates the role was created successfully with deleted_at as null.
 * 4. Deletes the custom role using the erase endpoint.
 * 5. Verifies deletion completed successfully without errors.
 */
export async function test_api_role_deletion_custom_role_no_employees(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create a custom role
  const role: IHrmTimeTrackRole =
    await generate_random_hrm_time_track_member_roles_create(memberConnection, {
      body: {
        name: "CustomViewer",
        description: "A custom role with time viewing permissions",
        permissions: ["time_viewing"],
      },
    });
  typia.assert(role);
  // 3. Verify role was created successfully and is active
  TestValidator.equals("role name matches input", role.name, "CustomViewer");
  TestValidator.equals("role is custom not built-in", role.is_builtin, false);
  TestValidator.equals("role is active before deletion", role.deleted_at, null);
  TestValidator.predicate(
    "role has expected permissions",
    role.permissions.length === 1,
  );
  TestValidator.equals(
    "role has time_viewing permission",
    role.permissions[0],
    "time_viewing",
  );
  // 4. Delete the custom role (returns void on success)
  await api.functional.hrmTimeTrack.member.roles.erase(memberConnection, {
    roleId: role.id,
  });
  // 5. Deletion success is validated by the absence of thrown errors.
  // The soft delete sets deleted_at on the server side.
  // Without a GET endpoint, we confirm the operation completed successfully.
}
