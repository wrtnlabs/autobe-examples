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

export async function test_api_role_permission_duplicate_grant_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and get an authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a new organization (the creating member becomes Owner automatically)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a custom role with a different initial permission (not employee:view)
  //    so we can freely add employee:view on the first call
  const role = await generate_random_erp_hrm_member_organizations_roles_create(
    memberConnection,
    {
      params: { organizationId: organization.id },
      body: {
        name: RandomGenerator.alphaNumeric(10),
        permissions: ["project:view"],
      },
    },
  );
  typia.assert(role);
  // 4. First grant: add employee:view to the custom role — should succeed
  const firstGrant =
    await generate_random_erp_hrm_member_organizations_roles_permissions_create(
      memberConnection,
      {
        params: {
          organizationId: organization.id,
          roleId: role.id,
        },
        body: { permission_code: "employee:view" },
      },
    );
  typia.assert(firstGrant);
  TestValidator.equals(
    "first grant permission_code matches",
    firstGrant.permission_code,
    "employee:view",
  );
  // 5. Second grant: try to add employee:view again — should be rejected with 409 Conflict
  await TestValidator.error(
    "duplicate permission grant rejected with conflict error",
    async () => {
      await generate_random_erp_hrm_member_organizations_roles_permissions_create(
        memberConnection,
        {
          params: {
            organizationId: organization.id,
            roleId: role.id,
          },
          body: { permission_code: "employee:view" },
        },
      );
    },
  );
}
