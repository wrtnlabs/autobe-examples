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
import { generate_random_hrm_time_track_member_roles_create } from "../../../generate/generate_random_hrm_time_track_member_roles_create";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";
import { prepare_random_hrm_time_track_role } from "../../../prepare/prepare_random_hrm_time_track_role";

/**
 * Test updating a custom role's name and description successfully.
 *
 * Validates the complete role update workflow including member authentication, organization setup, custom role creation, and role attribute modification. Ensures that custom roles can have both their name and description updated while preserving permissions and organization association.
 *
 * Special attention is given to verifying that the updated role maintains its custom status (is_builtin=false), that the updated_at timestamp reflects the modification, and that all permissions are preserved in the response.
 *
 * 1. Member registers and authenticates using authorize_member_join utility.
 * 2. Organization is created using generate_random_hrm_time_track_member_organizations_create utility.
 * 3. Custom role is created with initial name, description, and permissions using generate_random_hrm_time_track_member_roles_create utility.
 * 4. Custom role is updated with new name and description using api.functional.hrmTimeTrack.member.roles.update.
 * 5. Validates updated role details match input, is_builtin remains false, updated_at timestamp changed, and permissions are preserved.
 */
export async function test_api_role_update_custom_role_name_and_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create custom role with initial attributes
  const initialRole = await generate_random_hrm_time_track_member_roles_create(
    memberConnection,
    {
      body: {
        name: "Initial Role Name",
        description: "Initial role description for testing",
        permissions: ["employee_viewing", "time_viewing_all"],
      },
    },
  );
  typia.assert(initialRole);
  // Store initial updated_at for comparison
  const initialUpdatedAt = initialRole.updated_at;
  // 4. Update custom role with new name and description
  const updatedRole = await api.functional.hrmTimeTrack.member.roles.update(
    memberConnection,
    {
      roleId: initialRole.id,
      body: {
        name: "Updated Role Name",
        description: "Updated role description after modification",
      } satisfies IHrmTimeTrackRole.IUpdate,
    },
  );
  typia.assert(updatedRole);
  // 5. Validate updated role attributes
  TestValidator.equals(
    "name matches update",
    updatedRole.name,
    "Updated Role Name",
  );
  TestValidator.equals(
    "description matches update",
    updatedRole.description,
    "Updated role description after modification",
  );
  TestValidator.predicate("is custom role", updatedRole.is_builtin === false);
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedRole.updated_at,
    initialUpdatedAt,
  );
  TestValidator.equals("permissions preserved", updatedRole.permissions, [
    "employee_viewing",
    "time_viewing_all",
  ]);
  TestValidator.predicate("has valid id", updatedRole.id !== undefined);
  TestValidator.predicate(
    "has created_at",
    updatedRole.created_at !== undefined,
  );
  TestValidator.predicate(
    "deleted_at is null",
    updatedRole.deleted_at === null,
  );
}