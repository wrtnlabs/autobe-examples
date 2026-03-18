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
 * Test duplicate name validation when updating a role.
 *
 * Creates two custom roles within an organization, then attempts to update
 * the second role's name to match the first role's name. Validates that the
 * system rejects the update with a 409 conflict error, enforcing the
 * uniqueness constraint that role names must be unique within an organization.
 */
export async function test_api_role_update_duplicate_name(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection
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
    } satisfies IErpHrmMember.IJoin,
  });
  // Create organization to contain the roles
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Create first custom role to establish a name that will be duplicated
  const firstRoleName = RandomGenerator.name(2);
  const firstRole = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    {
      body: {
        name: firstRoleName,
        permissions: [{ permission: "organization.manage" }],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(firstRole);
  // Create second custom role that will attempt name change to match first
  const secondRoleName = RandomGenerator.name(2);
  const secondRole = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    {
      body: {
        name: secondRoleName,
        permissions: [{ permission: "employee.view" }],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(secondRole);
  // Attempt to update second role with duplicate name - should fail with 409
  await TestValidator.httpError(
    "duplicate role name update returns 409 conflict",
    409,
    async () => {
      await api.functional.erpHrm.member.roles.update(memberConnection, {
        roleId: secondRole.id,
        body: {
          name: firstRoleName,
        } satisfies IErpHrmRole.IUpdate,
      });
    },
  );
}
