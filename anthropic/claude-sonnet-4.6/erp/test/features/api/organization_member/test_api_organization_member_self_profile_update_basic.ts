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
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_organization_member_self_profile_update_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a new organization (member automatically becomes Owner)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Primary success scenario: update position and employment_type
  const firstUpdate =
    await api.functional.erpHrm.member.organizations.members.update(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          position: "Senior Engineer",
          employment_type: "full-time",
        } satisfies IErpHrmOrganizationMember.IUpdate,
      },
    );
  typia.assert(firstUpdate);
  // Verify position and employment_type updated correctly
  TestValidator.equals(
    "position after first update",
    firstUpdate.position,
    "Senior Engineer",
  );
  TestValidator.equals(
    "employment_type after first update",
    firstUpdate.employment_type,
    "full-time",
  );
  // Verify status and role remain unchanged (active status, Owner built-in role)
  TestValidator.equals("status unchanged", firstUpdate.status, "active");
  TestValidator.predicate(
    "role is builtin",
    firstUpdate.role.is_builtin === true,
  );
  // Verify updated_at >= created_at
  TestValidator.predicate(
    "updated_at is not before created_at",
    new Date(firstUpdate.updated_at) >= new Date(firstUpdate.created_at),
  );
  // 4. Partial update: only update position, omit employment_type
  const secondUpdate =
    await api.functional.erpHrm.member.organizations.members.update(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          position: "Tech Lead",
        } satisfies IErpHrmOrganizationMember.IUpdate,
      },
    );
  typia.assert(secondUpdate);
  // Verify position updated, employment_type unchanged
  TestValidator.equals(
    "position after partial update",
    secondUpdate.position,
    "Tech Lead",
  );
  TestValidator.equals(
    "employment_type unchanged after partial update",
    secondUpdate.employment_type,
    "full-time",
  );
  // 5. Employment type cycling: part-time
  const partTimeUpdate =
    await api.functional.erpHrm.member.organizations.members.update(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          employment_type: "part-time",
        } satisfies IErpHrmOrganizationMember.IUpdate,
      },
    );
  typia.assert(partTimeUpdate);
  TestValidator.equals(
    "employment_type updated to part-time",
    partTimeUpdate.employment_type,
    "part-time",
  );
  // 6. Employment type cycling: contractor
  const contractorUpdate =
    await api.functional.erpHrm.member.organizations.members.update(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          employment_type: "contractor",
        } satisfies IErpHrmOrganizationMember.IUpdate,
      },
    );
  typia.assert(contractorUpdate);
  TestValidator.equals(
    "employment_type updated to contractor",
    contractorUpdate.employment_type,
    "contractor",
  );
  // 7. Employment type cycling: intern
  const internUpdate =
    await api.functional.erpHrm.member.organizations.members.update(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          employment_type: "intern",
        } satisfies IErpHrmOrganizationMember.IUpdate,
      },
    );
  typia.assert(internUpdate);
  TestValidator.equals(
    "employment_type updated to intern",
    internUpdate.employment_type,
    "intern",
  );
}
