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
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";
import { prepare_random_hrm_platform_role_permission } from "../../../prepare/prepare_random_hrm_platform_role_permission";

export async function test_api_role_custom_creation_with_single_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (becomes organization owner with org:manage permission)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create custom role with single permission (project:view)
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: [
          {
            permission: "project:view",
          },
        ],
      },
    },
  );
  typia.assert(role);
  // 3. Validate role metadata
  TestValidator.predicate("role id exists", role.id !== undefined);
  TestValidator.predicate("role name matches", role.name !== undefined);
  TestValidator.equals(
    "built_in is false for custom role",
    role.built_in,
    false,
  );
  TestValidator.predicate(
    "organization exists",
    role.organization !== undefined,
  );
  TestValidator.predicate(
    "organization id exists",
    role.organization.id !== undefined,
  );
  TestValidator.predicate(
    "organization name exists",
    role.organization.name !== undefined,
  );
  TestValidator.predicate("created_at exists", role.created_at !== undefined);
  TestValidator.predicate("updated_at exists", role.updated_at !== undefined);
  TestValidator.equals("deleted_at is null", role.deleted_at, null);
  // 4. Validate permissions array contains exactly one permission
  TestValidator.equals("permissions count is 1", role.permissions.length, 1);
  TestValidator.equals(
    "permission code matches",
    role.permissions[0].permission,
    "project:view",
  );
  TestValidator.predicate(
    "permission id exists",
    role.permissions[0].id !== undefined,
  );
  TestValidator.predicate(
    "permission created_at exists",
    role.permissions[0].created_at !== undefined,
  );
  TestValidator.predicate(
    "permission updated_at exists",
    role.permissions[0].updated_at !== undefined,
  );
  TestValidator.equals(
    "permission deleted_at is null",
    role.permissions[0].deleted_at,
    null,
  );
  // 5. Validate employees array is empty (newly created role has no assignments)
  TestValidator.equals(
    "no employees assigned initially",
    role.employees.length,
    0,
  );
}
