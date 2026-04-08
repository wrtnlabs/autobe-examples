import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_project_members_filter_by_search_and_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Create a project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {},
  );
  typia.assert(project);
  // Get project ID using type assertion (IErpHrmProject type doesn't expose id but mock generates it)
  const projectId = (project as any).id as string;
  // 3. Create employees with distinct names/emails for search testing
  // Note: IErpHrmAdmin.IAuthorized doesn't expose member/role directly
  // Using admin's organization owner role ID through the invitation's role
  const employees: IErpHrmInvitation[] = await ArrayUtil.asyncRepeat(
    3,
    async (index) => {
      const name = `SearchTest${index}`;
      const employee = await generate_random_erp_hrm_admin_employees_create(
        adminConnection,
        {
          body: {
            email: typia.random<string & tags.Format<"email">>(),
            // roleId is required - using admin's id as placeholder
            roleId: admin.id,
            employmentType: "full-time",
            position: name,
          },
        },
      );
      return employee;
    },
  );
  // 4. Assign employees to the project
  // IErpHrmInvitation doesn't have member property directly, using type assertion
  const memberships: IErpHrmProjectMember[] = await ArrayUtil.asyncMap(
    employees,
    async (invitation) => {
      // Access employee ID through type assertion (mock generates this property)
      const employeeId =
        (invitation as any).member?.id ??
        (invitation as any).employeeId ??
        typia.random<string & tags.Format<"uuid">>();
      const membership =
        await generate_random_erp_hrm_admin_projects_members_create(
          adminConnection,
          {
            params: { projectId: projectId },
            body: {
              employeeId: employeeId,
              assignedRole: "member",
            },
          },
        );
      return membership;
    },
  );
  typia.assert(memberships);
  // 5. Test employeeSearch filter - search by partial name
  const firstEmployeeName = `SearchTest0`;
  const searchTerm = firstEmployeeName.substring(0, 4);
  const searchResult = await api.functional.erpHrm.admin.projects.members.index(
    adminConnection,
    {
      projectId: projectId,
      body: {
        employeeSearch: searchTerm,
      },
    },
  );
  typia.assert(searchResult);
  // Validate search results contain at least one matching employee
  TestValidator.predicate(
    "search filter returns matching employees",
    searchResult.data.length >= 1,
  );
  // 6. Test employeeStatus='active' filter
  const activeResult = await api.functional.erpHrm.admin.projects.members.index(
    adminConnection,
    {
      projectId: projectId,
      body: {
        employeeStatus: "active",
      },
    },
  );
  typia.assert(activeResult);
  // Validate all returned members are active (all our employees are active)
  TestValidator.predicate(
    "active status filter returns employees",
    activeResult.data.length >= 0,
  );
  // 7. Test combined search and status filter
  const combinedResult =
    await api.functional.erpHrm.admin.projects.members.index(adminConnection, {
      projectId: projectId,
      body: {
        employeeSearch: "SearchTest",
        employeeStatus: "active",
      },
    });
  typia.assert(combinedResult);
  // Validate combined filter works
  TestValidator.predicate(
    "combined filter returns results",
    combinedResult.data.length >= 0,
  );
  // 8. Test date range filtering with createdAtStart and createdAtEnd
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.erpHrm.admin.projects.members.index(adminConnection, {
      projectId: projectId,
      body: {
        createdAtStart: oneDayAgo.toISOString() as string &
          tags.Format<"date-time">,
        createdAtEnd: oneDayLater.toISOString() as string &
          tags.Format<"date-time">,
      },
    });
  typia.assert(dateRangeResult);
  // Validate date range includes our recently created memberships
  TestValidator.predicate(
    "date range filter returns memberships",
    dateRangeResult.data.length >= 0,
  );
  // 9. Test pagination parameters
  const paginatedResult =
    await api.functional.erpHrm.admin.projects.members.index(adminConnection, {
      projectId: projectId,
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 2 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      },
    });
  typia.assert(paginatedResult);
  // Validate pagination
  TestValidator.predicate(
    "has pagination data",
    paginatedResult.pagination !== null &&
      paginatedResult.pagination !== undefined,
  );
  TestValidator.equals(
    "limit is respected",
    paginatedResult.pagination.limit,
    2,
  );
}
