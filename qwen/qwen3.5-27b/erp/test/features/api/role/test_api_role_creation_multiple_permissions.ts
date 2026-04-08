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
 * Test creating a custom role with multiple permissions to validate permission array handling.
 *
 * Validates the complete role creation workflow with comprehensive permission sets. Ensures that multiple permissions are correctly associated with a custom role and that the response accurately reflects all requested permissions.
 *
 * Special attention is given to verifying that the permissions array maintains order and contains all requested permission codes, and that the role is correctly marked as non-built-in.
 *
 * 1. Authenticate as a member with organization management permissions.
 * 2. Create a custom role with multiple valid permissions covering different domains.
 * 3. Validate response structure contains all expected fields.
 * 4. Verify permissions array matches input and is_builtin is false.
 */
export async function test_api_role_creation_multiple_permissions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
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
  // 2. Create role with multiple permissions
  const role = await api.functional.hrmTimeTrack.member.roles.create(
    memberConnection,
    {
      body: {
        name: "Senior Manager",
        description: "Senior management role with comprehensive permissions",
        permissions: [
          "organization_management",
          "employee_management",
          "project_management",
          "timesheet_approval",
          "report_viewing",
        ],
      } satisfies IHrmTimeTrackRole.ICreate,
    },
  );
  typia.assert(role);
  // 3. Validate business logic
  TestValidator.equals("role name matches input", role.name, "Senior Manager");
  TestValidator.equals(
    "role description matches input",
    role.description,
    "Senior management role with comprehensive permissions",
  );
  TestValidator.predicate("role is not built-in", role.is_builtin === false);
  TestValidator.equals(
    "deleted_at is null for active role",
    role.deleted_at,
    null,
  );
  // 4. Validate permissions array integrity
  const expectedPermissions = [
    "organization_management",
    "employee_management",
    "project_management",
    "timesheet_approval",
    "report_viewing",
  ];
  TestValidator.equals(
    "permissions count matches",
    role.permissions.length,
    expectedPermissions.length,
  );
  TestValidator.equals(
    "permissions array matches input",
    role.permissions,
    expectedPermissions,
  );
}
