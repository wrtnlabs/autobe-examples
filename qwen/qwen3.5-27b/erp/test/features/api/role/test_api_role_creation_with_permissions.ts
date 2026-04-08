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
 * Test the primary success path for creating a custom role within an organization.
 *
 * Validates the complete role creation workflow including member authentication and role creation with permissions. Ensures that the created role has the correct attributes including a generated UUID, the requested name and description, is marked as non-built-in, and contains the specified permissions array.
 *
 * Special attention is given to verifying that custom roles are correctly distinguished from built-in roles via the is_builtin flag, and that all permission codes are properly stored and returned.
 *
 * 1. Authenticate a member using the join endpoint to obtain organization context.
 * 2. Create a custom role with a unique name, description, and array of permission codes.
 * 3. Validate the created role has correct attributes including UUID, name, description, is_builtin=false, timestamps, and permissions.
 */
export async function test_api_role_creation_with_permissions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  // 2. Create role with permissions
  const role = await generate_random_hrm_time_track_member_roles_create(
    memberConnection,
    {
      body: {
        name: "Developer",
        description:
          "Role for developers with project management and time viewing permissions",
        permissions: ["project_management", "time_viewing_all"],
      } satisfies IHrmTimeTrackRole.ICreate,
    },
  );
  typia.assert(role);
  // 3. Validate role attributes (business logic, not type validation)
  TestValidator.equals("role name matches input", role.name, "Developer");
  TestValidator.equals(
    "role description matches input",
    role.description,
    "Role for developers with project management and time viewing permissions",
  );
  TestValidator.equals("role is custom (not built-in)", role.is_builtin, false);
  TestValidator.equals("role deleted_at is null", role.deleted_at, null);
  TestValidator.equals("role permissions match input", role.permissions, [
    "project_management",
    "time_viewing_all",
  ]);
}
