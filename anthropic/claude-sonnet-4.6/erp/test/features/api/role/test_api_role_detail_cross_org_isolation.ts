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

export async function test_api_role_detail_cross_org_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create first organization (Org A)
  const orgA = await generate_random_erp_hrm_member_organizations_create(
    memberConnection,
    {},
  );
  typia.assert(orgA);
  // Step 3: Create a custom role in Org A
  const roleInOrgA =
    await generate_random_erp_hrm_member_organizations_roles_create(
      memberConnection,
      {
        params: {
          organizationId: orgA.id,
        },
      },
    );
  typia.assert(roleInOrgA);
  // Step 4: Create a second organization (Org B)
  const orgB = await generate_random_erp_hrm_member_organizations_create(
    memberConnection,
    {},
  );
  typia.assert(orgB);
  // Cross-Org Isolation Test (Negative):
  // Using Org B's organizationId with Org A's roleId should return 404
  await TestValidator.error(
    "cross-org isolation: role from OrgA not accessible via OrgB",
    async () => {
      await api.functional.erpHrm.member.organizations.roles.at(
        memberConnection,
        {
          organizationId: orgB.id,
          roleId: roleInOrgA.id,
        },
      );
    },
  );
  // Positive Control Verification:
  // Using Org A's organizationId with Org A's roleId should return 200 with full role detail
  const roleDetail = await api.functional.erpHrm.member.organizations.roles.at(
    memberConnection,
    {
      organizationId: orgA.id,
      roleId: roleInOrgA.id,
    },
  );
  typia.assert(roleDetail);
  // Verify that the returned role belongs to Org A
  TestValidator.equals("role id matches", roleDetail.id, roleInOrgA.id);
  TestValidator.equals(
    "role organizationId matches orgA",
    roleDetail.organizationId,
    orgA.id,
  );
}
