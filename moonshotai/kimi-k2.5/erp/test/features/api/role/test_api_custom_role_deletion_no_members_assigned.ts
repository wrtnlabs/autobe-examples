import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";

/**
 * Test successful deletion of an unassigned custom role.
 *
 * This test verifies the primary success path where an organization owner
 * with management permissions deletes a custom role that has no employees
 * assigned to it. The test validates:
 * 1. Member can be authenticated
 * 2. Organization can be created (member becomes owner with management permissions)
 * 3. Custom role can be created within the organization
 * 4. Custom role with no assigned members can be deleted successfully
 * 5. Deletion endpoint returns success
 */
export async function test_api_custom_role_deletion_no_members_assigned(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as an organization member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  // Step 2: Create an organization (member becomes owner with full permissions)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create a custom role with organization.manage permission
  const customRole = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    {
      body: {
        name: `TestRole_${RandomGenerator.alphaNumeric(8)}`,
        description: "Custom role for deletion test",
        permissions: [
          { permission: "organization.manage" },
          { permission: "employee.view" },
        ] satisfies IErpHrmRolePermission.ICreate[],
      },
    },
  );
  typia.assert(customRole);
  // Step 4: Delete the custom role (no members assigned)
  // This should succeed because the role is not built-in and has no members
  await api.functional.erpHrm.member.roles.erase(memberConnection, {
    roleId: customRole.id,
  });
  // Step 5: Deletion successful - void return indicates the role was soft-deleted
  // The role remains in database for audit purposes but is marked as deleted
}
