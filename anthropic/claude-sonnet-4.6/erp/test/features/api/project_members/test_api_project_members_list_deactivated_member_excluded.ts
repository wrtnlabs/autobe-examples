import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProjectMember";
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
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_project_members_list_deactivated_member_excluded(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register manager and authenticate
  const managerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(managerConnection, {});
  // 2. Create organization (manager is the owner)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      managerConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create project under that organization
  const project = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {},
  );
  typia.assert(project);
  // 4. Register employee A
  const employeeAConnection: api.IConnection = { host: connection.host };
  const employeeA = await authorize_member_join(employeeAConnection, {});
  typia.assert(employeeA);
  // 5. Add employee A to the organization
  const orgMemberA =
    await generate_random_erp_hrm_member_organizations_members_create(
      managerConnection,
      {
        body: {
          memberId: employeeA.member.id,
          employmentType: "full-time",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(orgMemberA);
  // 6. Assign employee A to the project
  const projectMemberA =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        body: {
          organizationMemberId: orgMemberA.id,
          projectRole: "member",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMemberA);
  // 7. Register employee B
  const employeeBConnection: api.IConnection = { host: connection.host };
  const employeeB = await authorize_member_join(employeeBConnection, {});
  typia.assert(employeeB);
  // 8. Add employee B to the organization
  const orgMemberB =
    await generate_random_erp_hrm_member_organizations_members_create(
      managerConnection,
      {
        body: {
          memberId: employeeB.member.id,
          employmentType: "full-time",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(orgMemberB);
  // 9. Assign employee B to the project
  const projectMemberB =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        body: {
          organizationMemberId: orgMemberB.id,
          projectRole: "member",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMemberB);
  // 10. Verify initial list has 2 members
  const initialList = await api.functional.erpHrm.member.projects.members.index(
    managerConnection,
    {
      projectId: project.id,
      body: {} satisfies IErpHrmProjectMember.IRequest,
    },
  );
  typia.assert(initialList);
  TestValidator.equals(
    "initial list records count",
    initialList.pagination.records,
    2,
  );
  TestValidator.equals("initial list data length", initialList.data.length, 2);
  // 11. Remove employee A from the project
  await api.functional.erpHrm.member.projects.members.erase(managerConnection, {
    projectId: project.id,
    projectMemberId: projectMemberA.id,
  });
  // 12. Call list after removal - should only have employee B
  const listAfterRemoval =
    await api.functional.erpHrm.member.projects.members.index(
      managerConnection,
      {
        projectId: project.id,
        body: {} satisfies IErpHrmProjectMember.IRequest,
      },
    );
  typia.assert(listAfterRemoval);
  TestValidator.equals(
    "records after removal",
    listAfterRemoval.pagination.records,
    1,
  );
  TestValidator.equals(
    "data length after removal",
    listAfterRemoval.data.length,
    1,
  );
  TestValidator.equals(
    "pagination current page",
    listAfterRemoval.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination pages",
    listAfterRemoval.pagination.pages,
    1,
  );
  TestValidator.equals(
    "remaining member is employee B",
    listAfterRemoval.data[0]!.organizationMember.id,
    orgMemberB.id,
  );
  // 13. Verify ascending sort - same single record returned
  const listAscSort = await api.functional.erpHrm.member.projects.members.index(
    managerConnection,
    {
      projectId: project.id,
      body: {
        sort: "created_at",
        order: "ASC",
      } satisfies IErpHrmProjectMember.IRequest,
    },
  );
  typia.assert(listAscSort);
  TestValidator.equals(
    "asc sort records count",
    listAscSort.pagination.records,
    1,
  );
  TestValidator.equals("asc sort data length", listAscSort.data.length, 1);
  TestValidator.equals(
    "asc sort remaining member is employee B",
    listAscSort.data[0]!.organizationMember.id,
    orgMemberB.id,
  );
  // 14. Verify future date range filter returns 0 records
  const futureDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString();
  const listFutureFilter =
    await api.functional.erpHrm.member.projects.members.index(
      managerConnection,
      {
        projectId: project.id,
        body: {
          createdAtFrom: futureDate,
        } satisfies IErpHrmProjectMember.IRequest,
      },
    );
  typia.assert(listFutureFilter);
  TestValidator.equals(
    "future filter records count",
    listFutureFilter.pagination.records,
    0,
  );
  TestValidator.equals(
    "future filter data is empty",
    listFutureFilter.data.length,
    0,
  );
}
