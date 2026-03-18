import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_roles_create } from "../../../generate/generate_random_erp_hrm_member_organizations_roles_create";
import { generate_random_erp_hrm_member_organizations_roles_permissions_create } from "../../../generate/generate_random_erp_hrm_member_organizations_roles_permissions_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";

export async function test_api_role_permission_grant_to_custom_role(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member (becomes org owner automatically)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a new organization (authenticated member is auto-assigned as Owner)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create a custom role with initial permission 'report:view'
  const customRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      memberConnection,
      {
        body: {
          name: "Reporting Analyst",
          permissions: ["report:view"],
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(customRole);
  // Step 4: Grant a new permission 'project:view' to the custom role
  const permissionGrant =
    await generate_random_erp_hrm_member_organizations_roles_permissions_create(
      memberConnection,
      {
        body: {
          permission_code: "project:view",
        },
        params: {
          organizationId: organization.id,
          roleId: customRole.id,
        },
      },
    );
  typia.assert(permissionGrant);
  // Step 5: Validate the response
  TestValidator.equals(
    "permission_code matches",
    permissionGrant.permission_code,
    "project:view",
  );
  TestValidator.equals(
    "role id matches custom role",
    permissionGrant.role.id,
    customRole.id,
  );
  TestValidator.equals(
    "role is not builtin",
    permissionGrant.role.is_builtin,
    false,
  );
}
