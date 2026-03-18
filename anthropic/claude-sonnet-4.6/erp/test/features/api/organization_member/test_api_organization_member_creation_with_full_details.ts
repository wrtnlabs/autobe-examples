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
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_departments_create } from "../../../generate/generate_random_erp_hrm_member_organizations_departments_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";

export async function test_api_organization_member_creation_with_full_details(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register the organization owner/creator account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuth);
  // Step 2: Create an organization — the owner is auto-assigned Owner role with employee:manage permission
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create a department within the organization
  const department =
    await generate_random_erp_hrm_member_organizations_departments_create(
      ownerConnection,
      {
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(department);
  // Step 4: Register the second platform-level member account (to be added as org member)
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMemberAuth = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(secondMemberAuth);
  // Use the built-in Owner role (from the organization's owner member) as roleId
  // The owner.role is the Owner built-in role available from the organization response
  const builtinRoleId = organization.owner.role.id;
  // Step 5: Add the second member to the organization with full details
  const organizationMember =
    await generate_random_erp_hrm_member_organization_members_create(
      ownerConnection,
      {
        body: {
          memberId: secondMemberAuth.member.id,
          roleId: builtinRoleId,
          employmentType: "full-time",
          departmentId: department.id,
          position: "Senior Engineer",
        },
      },
    );
  typia.assert(organizationMember);
  // Validate the returned organization member fields
  TestValidator.equals(
    "organization_id matches",
    organizationMember.organization_id,
    organization.id,
  );
  TestValidator.equals(
    "email matches second member email",
    organizationMember.email,
    secondMemberAuth.member.email,
  );
  TestValidator.equals(
    "employment_type is full-time",
    organizationMember.employment_type,
    "full-time",
  );
  TestValidator.equals("status is active", organizationMember.status, "active");
  TestValidator.equals(
    "position is Senior Engineer",
    organizationMember.position,
    "Senior Engineer",
  );
  TestValidator.equals(
    "role is builtin",
    organizationMember.role.is_builtin,
    true,
  );
  TestValidator.equals(
    "role id matches assigned role",
    organizationMember.role.id,
    builtinRoleId,
  );
  TestValidator.predicate(
    "department is assigned",
    organizationMember.department !== null,
  );
  if (organizationMember.department !== null) {
    TestValidator.equals(
      "department id matches",
      organizationMember.department.id,
      department.id,
    );
    TestValidator.equals(
      "department name matches",
      organizationMember.department.name,
      department.name,
    );
  }
  TestValidator.equals(
    "deleted_at is null",
    organizationMember.deleted_at,
    null,
  );
}
