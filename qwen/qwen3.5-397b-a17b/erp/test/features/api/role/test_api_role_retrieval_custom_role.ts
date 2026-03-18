import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
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
import { prepare_random_hrm_platform_role_permission } from "../../../prepare/prepare_random_hrm_platform_role_permission";

export async function test_api_role_retrieval_custom_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins the platform
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization workspace
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create custom role with specific permissions
  const customRoleName = `Custom Role ${RandomGenerator.alphabets(5)}`;
  const customRole = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: customRoleName,
        permissions: [
          {
            permission: "project:view",
          } satisfies IHrmPlatformRolePermission.ICreate,
          {
            permission: "time:view_all",
          } satisfies IHrmPlatformRolePermission.ICreate,
        ],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(customRole);
  // 4. Retrieve the custom role details using role ID
  const retrievedRole = await api.functional.hrmPlatform.member.roles.at(
    memberConnection,
    {
      roleId: customRole.id,
    },
  );
  typia.assert(retrievedRole);
  // Validate role details
  TestValidator.equals("role name matches", retrievedRole.name, customRoleName);
  TestValidator.predicate(
    "is custom role (not built-in)",
    !retrievedRole.built_in,
  );
  TestValidator.equals(
    "organization ID matches",
    retrievedRole.organization.id,
    organization.id,
  );
  TestValidator.predicate(
    "permissions array exists",
    retrievedRole.permissions.length > 0,
  );
  TestValidator.predicate(
    "employee array exists",
    Array.isArray(retrievedRole.employees),
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    retrievedRole.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    retrievedRole.updated_at !== null,
  );
  TestValidator.predicate(
    "deleted_at is null (active role)",
    retrievedRole.deleted_at === null,
  );
  // Validate permissions contain expected values
  const permissionCodes = retrievedRole.permissions.map((p) => p.permission);
  TestValidator.predicate(
    "contains project:view permission",
    permissionCodes.includes("project:view"),
  );
  TestValidator.predicate(
    "contains time:view_all permission",
    permissionCodes.includes("time:view_all"),
  );
}
