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
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_role_deletion_by_owner_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member (becomes organization owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(ownerConnection, {});
  typia.assert(authorized);
  // 2. Create a new organization; the authenticated member automatically becomes the Owner
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a custom role with no assigned members so it can be deleted
  const role = await generate_random_erp_hrm_member_organizations_roles_create(
    ownerConnection,
    {
      body: {
        name: "Analyst",
        permissions: ["report:view"],
      },
      params: {
        organizationId: organization.id,
      },
    },
  );
  typia.assert(role);
  // Validate the created role is a custom (non-builtin) role with expected properties
  TestValidator.equals(
    "role organization id",
    role.organizationId,
    organization.id,
  );
  TestValidator.equals("role name", role.name, "Analyst");
  TestValidator.predicate("role is not builtin", role.isBuiltin === false);
  TestValidator.predicate(
    "role has report:view permission",
    role.permissions.some((p) => p.permission_code === "report:view"),
  );
  // 4. Delete the custom role as the organization owner
  await api.functional.erpHrm.member.organizations.roles.erase(
    ownerConnection,
    {
      organizationId: organization.id,
      roleId: role.id,
    },
  );
}
