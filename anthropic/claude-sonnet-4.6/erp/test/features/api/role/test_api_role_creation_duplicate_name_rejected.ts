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

export async function test_api_role_creation_duplicate_name_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and set up authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a new organization (member becomes owner with org:manage permission)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Attempt to create a custom role named 'Owner' (conflicts with built-in role)
  await TestValidator.error(
    "creating role with built-in name 'Owner' should be rejected",
    async () => {
      await api.functional.erpHrm.member.organizations.roles.create(
        memberConnection,
        {
          organizationId: organization.id,
          body: {
            name: "Owner",
            permissions: ["employee:view"],
          } satisfies IErpHrmRole.ICreate,
        },
      );
    },
  );
  // Step 4: Create a custom role with a unique name 'Finance Lead' — should succeed
  const financeLeadRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: "Finance Lead",
          permissions: ["employee:view", "report:view"],
        },
      },
    );
  typia.assert(financeLeadRole);
  TestValidator.equals(
    "role name should be Finance Lead",
    financeLeadRole.name,
    "Finance Lead",
  );
  // Step 5: Attempt to create another role with the same name 'Finance Lead' — should be rejected
  await TestValidator.error(
    "creating role with duplicate name 'Finance Lead' should be rejected",
    async () => {
      await api.functional.erpHrm.member.organizations.roles.create(
        memberConnection,
        {
          organizationId: organization.id,
          body: {
            name: "Finance Lead",
            permissions: ["employee:manage"],
          } satisfies IErpHrmRole.ICreate,
        },
      );
    },
  );
  // Step 6: Verify that the original 'Finance Lead' role was not affected by the failed creation
  TestValidator.equals(
    "original Finance Lead role name unchanged",
    financeLeadRole.name,
    "Finance Lead",
  );
  TestValidator.predicate(
    "original Finance Lead role is not built-in",
    financeLeadRole.isBuiltin === false,
  );
  TestValidator.equals(
    "original Finance Lead role belongs to the correct organization",
    financeLeadRole.organizationId,
    organization.id,
  );
}
