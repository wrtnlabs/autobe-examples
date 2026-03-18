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
import { generate_random_erp_hrm_member_organizations_members_create } from "../../../generate/generate_random_erp_hrm_member_organizations_members_create";
import { generate_random_erp_hrm_member_organizations_roles_create } from "../../../generate/generate_random_erp_hrm_member_organizations_roles_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_organization_member_add_duplicate_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuthorized);
  // Step 2: Create organization (as owner)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create a custom role in the organization
  const role = await generate_random_erp_hrm_member_organizations_roles_create(
    ownerConnection,
    {
      params: { organizationId: organization.id },
    },
  );
  typia.assert(role);
  // Step 4: Register a second platform user
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUserAuthorized = await authorize_member_join(
    secondUserConnection,
    {},
  );
  typia.assert(secondUserAuthorized);
  // Step A: Add the second user to the organization for the first time (should succeed)
  const addedMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      ownerConnection,
      {
        body: {
          memberId: secondUserAuthorized.member.id,
          roleId: role.id,
          employmentType: "part-time",
        },
        params: { organizationId: organization.id },
      },
    );
  typia.assert(addedMember);
  // Validate Step A result: status should be 'active' and email matches second user
  TestValidator.equals(
    "first add: status is active",
    addedMember.status,
    "active",
  );
  TestValidator.equals(
    "first add: member email matches second user",
    addedMember.email,
    secondUserAuthorized.member.email,
  );
  // Step B: Attempt to add the same second user again (should fail with 409 Conflict)
  await TestValidator.httpError(
    "duplicate member add returns 409 conflict",
    409,
    async () => {
      await generate_random_erp_hrm_member_organizations_members_create(
        ownerConnection,
        {
          body: {
            memberId: secondUserAuthorized.member.id,
            roleId: role.id,
            employmentType: "part-time",
          },
          params: { organizationId: organization.id },
        },
      );
    },
  );
}
