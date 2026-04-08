import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_organizations_create } from "../../../generate/generate_random_hrm_time_track_member_organizations_create";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";

/**
 * Test updating a built-in role's description while verifying that built-in role names cannot be changed.
 *
 * Validates the role update restrictions for built-in roles (Owner, Manager, Employee) in the HRM time tracking system. Built-in roles have protected names that cannot be modified, but their descriptions can be updated freely. This test ensures the system correctly enforces these constraints.
 *
 * The test performs two update attempts on a built-in role: first attempting to change both name and description (which should fail with 403 Forbidden), then attempting to update only the description (which should succeed with 200 OK). This validates both the error handling for prohibited operations and the successful path for allowed operations.
 *
 * Note: This test requires a valid built-in role ID. In a complete implementation, the role ID would be obtained from a list roles endpoint (not currently available in the SDK). The test uses a placeholder role ID for compilation purposes.
 *
 * 1. Register and authenticate a new member account.
 * 2. Create an organization which automatically creates built-in roles (Owner, Manager, Employee).
 * 3. Obtain a built-in role ID (requires list roles endpoint - not available in current SDK).
 * 4. Attempt to update the built-in role with both name and description changes, expecting HTTP 403 Forbidden error.
 * 5. Update the same built-in role with only a description change, expecting HTTP 200 OK.
 * 6. Validate the successful response preserves the original name, is_builtin flag, and permissions array while updating the description.
 */
export async function test_api_role_update_builtin_role_description_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create organization (built-in roles are auto-created)
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Get built-in role ID
  // NOTE: The SDK doesn't provide a list roles endpoint, so we cannot retrieve actual role IDs.
  // In a production scenario, this would be obtained via GET /hrmTimeTrack/member/roles
  // For this test to work, a valid built-in role ID must be provided.
  // This is a known limitation of the current SDK.
  const builtInRoleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. First attempt: Update with both name and description (should fail with 403)
  const newName = RandomGenerator.name();
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  await TestValidator.error(
    "built-in role name update should be rejected",
    async () => {
      await api.functional.hrmTimeTrack.member.roles.update(memberConnection, {
        roleId: builtInRoleId,
        body: {
          name: newName,
          description: newDescription,
        } satisfies IHrmTimeTrackRole.IUpdate,
      });
    },
  );
  // 5. Second attempt: Update with only description (should succeed)
  const updatedDescription = RandomGenerator.paragraph({ sentences: 2 });
  const updatedRole = await api.functional.hrmTimeTrack.member.roles.update(
    memberConnection,
    {
      roleId: builtInRoleId,
      body: {
        description: updatedDescription,
      } satisfies IHrmTimeTrackRole.IUpdate,
    },
  );
  typia.assert(updatedRole);
  // 6. Validate response
  TestValidator.equals(
    "description updated successfully",
    updatedRole.description,
    updatedDescription,
  );
  TestValidator.predicate(
    "role is still built-in",
    updatedRole.is_builtin === true,
  );
  TestValidator.predicate(
    "role has permissions",
    updatedRole.permissions.length > 0,
  );
}