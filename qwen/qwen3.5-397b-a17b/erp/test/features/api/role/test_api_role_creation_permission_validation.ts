import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

export async function test_api_role_creation_permission_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Select the organization to establish working context
  const selectedOrg =
    await api.functional.hrmPlatform.member.organizations.select(
      memberConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(selectedOrg);
  TestValidator.equals(
    "selected organization matches",
    selectedOrg.id,
    organization.id,
  );
  // 4. Create custom roles with different permission combinations
  // 4.1 Role with single permission (org:manage)
  const singlePermissionRole =
    await api.functional.hrmPlatform.member.roles.create(memberConnection, {
      body: {
        name: RandomGenerator.name(),
        description: "Role with single permission",
        permissions: ["org:manage"],
      } satisfies IHrmPlatformRole.ICreate,
    });
  typia.assert(singlePermissionRole);
  TestValidator.equals(
    "single permission role has correct permissions count",
    singlePermissionRole.permissions.length,
    1,
  );
  TestValidator.equals(
    "single permission matches",
    singlePermissionRole.permissions[0].permission,
    "org:manage",
  );
  // 4.2 Role with all nine available permissions
  const allPermissionsRole =
    await api.functional.hrmPlatform.member.roles.create(memberConnection, {
      body: {
        name: RandomGenerator.name(),
        description: "Role with all permissions",
        permissions: [
          "org:manage",
          "employee:manage",
          "employee:view",
          "project:manage",
          "project:view",
          "time:manage",
          "time:approve",
          "time:view_all",
          "report:view",
        ],
      } satisfies IHrmPlatformRole.ICreate,
    });
  typia.assert(allPermissionsRole);
  TestValidator.equals(
    "all permissions role has correct permissions count",
    allPermissionsRole.permissions.length,
    9,
  );
  // 4.3 Role with only time-related permissions
  const timePermissionsRole =
    await api.functional.hrmPlatform.member.roles.create(memberConnection, {
      body: {
        name: RandomGenerator.name(),
        description: "Role with time-related permissions",
        permissions: ["time:manage", "time:approve", "time:view_all"],
      } satisfies IHrmPlatformRole.ICreate,
    });
  typia.assert(timePermissionsRole);
  TestValidator.equals(
    "time permissions role has correct permissions count",
    timePermissionsRole.permissions.length,
    3,
  );
  const timePermissionCodes = timePermissionsRole.permissions
    .map((p) => p.permission)
    .sort();
  TestValidator.equals("time permissions match", timePermissionCodes, [
    "time:approve",
    "time:manage",
    "time:view_all",
  ]);
  // 4.4 Role with employee-related permissions
  const employeePermissionsRole =
    await api.functional.hrmPlatform.member.roles.create(memberConnection, {
      body: {
        name: RandomGenerator.name(),
        description: "Role with employee-related permissions",
        permissions: ["employee:manage", "employee:view"],
      } satisfies IHrmPlatformRole.ICreate,
    });
  typia.assert(employeePermissionsRole);
  TestValidator.equals(
    "employee permissions role has correct permissions count",
    employeePermissionsRole.permissions.length,
    2,
  );
  const employeePermissionCodes = employeePermissionsRole.permissions
    .map((p) => p.permission)
    .sort();
  TestValidator.equals("employee permissions match", employeePermissionCodes, [
    "employee:manage",
    "employee:view",
  ]);
  // 4.5 Role with project-related permissions
  const projectPermissionsRole =
    await api.functional.hrmPlatform.member.roles.create(memberConnection, {
      body: {
        name: RandomGenerator.name(),
        description: "Role with project-related permissions",
        permissions: ["project:manage", "project:view"],
      } satisfies IHrmPlatformRole.ICreate,
    });
  typia.assert(projectPermissionsRole);
  TestValidator.equals(
    "project permissions role has correct permissions count",
    projectPermissionsRole.permissions.length,
    2,
  );
  const projectPermissionCodes = projectPermissionsRole.permissions
    .map((p) => p.permission)
    .sort();
  TestValidator.equals("project permissions match", projectPermissionCodes, [
    "project:manage",
    "project:view",
  ]);
  // 5. Validate all roles are custom (not built-in)
  TestValidator.predicate(
    "single permission role is custom",
    !singlePermissionRole.is_builtin,
  );
  TestValidator.predicate(
    "all permissions role is custom",
    !allPermissionsRole.is_builtin,
  );
  TestValidator.predicate(
    "time permissions role is custom",
    !timePermissionsRole.is_builtin,
  );
  TestValidator.predicate(
    "employee permissions role is custom",
    !employeePermissionsRole.is_builtin,
  );
  TestValidator.predicate(
    "project permissions role is custom",
    !projectPermissionsRole.is_builtin,
  );
  // 6. Validate all roles belong to the correct organization
  TestValidator.equals(
    "single permission role organization",
    singlePermissionRole.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "all permissions role organization",
    allPermissionsRole.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "time permissions role organization",
    timePermissionsRole.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "employee permissions role organization",
    employeePermissionsRole.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "project permissions role organization",
    projectPermissionsRole.organization.id,
    organization.id,
  );
}