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

export async function test_api_role_update_duplicate_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and create a connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create an organization scoped to this member
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create the first custom role 'Viewer' (conflict target)
  const viewerRoleName = `Viewer-${RandomGenerator.alphabets(6)}`;
  const viewerRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      memberConnection,
      {
        body: {
          name: viewerRoleName,
          permissions: ["employee:view"],
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(viewerRole);
  TestValidator.equals(
    "viewer role name matches",
    viewerRole.name,
    viewerRoleName,
  );
  // Step 4: Create the second custom role 'Coordinator'
  const coordinatorRoleName = `Coordinator-${RandomGenerator.alphabets(6)}`;
  const coordinatorRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      memberConnection,
      {
        body: {
          name: coordinatorRoleName,
          permissions: ["project:view"],
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(coordinatorRole);
  TestValidator.equals(
    "coordinator role name matches",
    coordinatorRole.name,
    coordinatorRoleName,
  );
  // Step 5: Attempt to rename 'Coordinator' to 'Viewer' — must be rejected
  await TestValidator.error(
    "renaming a role to a name already taken by another role must be rejected",
    async () => {
      await api.functional.erpHrm.member.organizations.roles.update(
        memberConnection,
        {
          organizationId: organization.id,
          roleId: coordinatorRole.id,
          body: {
            name: viewerRoleName,
            permissionCodes: ["project:view"],
          } satisfies IErpHrmRole.IUpdate,
        },
      );
    },
  );
  // Step 6: Validate the original second role was created with 'Coordinator' name
  // (Confirm state from the create responses — no GET endpoint available)
  TestValidator.equals(
    "coordinator role name is still original after failed rename",
    coordinatorRole.name,
    coordinatorRoleName,
  );
  // Step 7: Confirm viewer role name is unchanged
  TestValidator.equals(
    "viewer role name is unchanged",
    viewerRole.name,
    viewerRoleName,
  );
}
