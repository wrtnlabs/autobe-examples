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

export async function test_api_organization_member_detail_with_department(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the owner member and authenticate (connection headers updated internally)
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create an organization (ownerConnection is now authenticated)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a department within the organization with specific name and description
  const departmentName = `Dept-${RandomGenerator.alphabets(6)}`;
  const departmentDescription = RandomGenerator.paragraph({ sentences: 2 });
  const department =
    await generate_random_erp_hrm_member_organizations_departments_create(
      ownerConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          name: departmentName,
          description: departmentDescription,
          parentId: null,
        },
      },
    );
  typia.assert(department);
  // 4. Register a second platform member
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMemberAuth = await authorize_member_join(secondMemberConnection, {
    body: {
      email: secondMemberEmail,
    },
  });
  // 5. As the owner, add the second member to the organization with department assignment
  // Use the owner's role id which is available from the organization response
  const roleId = organization.owner.role.id;
  const organizationMember =
    await generate_random_erp_hrm_member_organization_members_create(
      ownerConnection,
      {
        body: {
          memberId: secondMemberAuth.member.id,
          roleId: roleId,
          employmentType: "contractor",
          departmentId: department.id,
          position: "Backend Contractor",
        },
      },
    );
  typia.assert(organizationMember);
  // Test Execution: GET the organization member detail
  const memberDetail =
    await api.functional.erpHrm.member.organizationMembers.at(ownerConnection, {
      organizationMemberId: organizationMember.id,
    });
  typia.assert(memberDetail);
  // Business logic validations
  TestValidator.equals(
    "employment_type is contractor",
    memberDetail.employment_type,
    "contractor",
  );
  TestValidator.equals("status is active", memberDetail.status, "active");
  TestValidator.equals(
    "position matches",
    memberDetail.position,
    "Backend Contractor",
  );
  TestValidator.equals(
    "email matches second member",
    memberDetail.email,
    secondMemberEmail,
  );
  // Department validations
  TestValidator.predicate(
    "department is not null",
    memberDetail.department !== null,
  );
  if (memberDetail.department !== null) {
    TestValidator.equals(
      "department id matches",
      memberDetail.department.id,
      department.id,
    );
    TestValidator.equals(
      "department name matches",
      memberDetail.department.name,
      departmentName,
    );
    TestValidator.equals(
      "department description matches",
      memberDetail.department.description,
      departmentDescription,
    );
    TestValidator.equals(
      "department parent is null (top-level)",
      memberDetail.department.parent,
      null,
    );
  }
}
