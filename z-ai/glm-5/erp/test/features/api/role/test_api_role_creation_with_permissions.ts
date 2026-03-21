import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_role_creation_with_permissions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member (via join, which creates first organization)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
  // 2. Create a custom role with permissions
  const roleName = RandomGenerator.name();
  const permissions: IErpHrmRole.ICreate["permissions"] = [
    "employee:view",
    "project:manage",
    "time:approve",
  ];
  const role = await api.functional.erpHrm.member.roles.create(
    memberConnection,
    {
      body: {
        name: roleName,
        permissions,
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(role);
  // 3. Verify the response contains the created role with correct properties
  TestValidator.equals("role name matches", role.name, roleName);
  TestValidator.equals("is_builtin is false", role.is_builtin, false);
  TestValidator.equals(
    "permissions count",
    role.permissions.length,
    permissions.length,
  );
  TestValidator.predicate(
    "all permissions assigned",
    permissions.every((p) => role.permissions.includes(p)),
  );
  TestValidator.equals("deleted_at is null", role.deleted_at, null);
}
