import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IHrmTimeTrackProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProjectMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_employees_create } from "../../../generate/generate_random_hrm_time_track_member_employees_create";
import { generate_random_hrm_time_track_member_organizations_create } from "../../../generate/generate_random_hrm_time_track_member_organizations_create";
import { generate_random_hrm_time_track_member_projects_create } from "../../../generate/generate_random_hrm_time_track_member_projects_create";
import { generate_random_hrm_time_track_member_projects_members_create } from "../../../generate/generate_random_hrm_time_track_member_projects_members_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";
import { prepare_random_hrm_time_track_project } from "../../../prepare/prepare_random_hrm_time_track_project";
import { prepare_random_hrm_time_track_project_member } from "../../../prepare/prepare_random_hrm_time_track_project_member";

/**
 * Test filtering project members by role and employee status.
 *
 * Validates the complete project member filtering workflow including role-based filtering, employee status filtering, combined filtering, search functionality, and sorting capabilities. Ensures that the filtering correctly returns only matching project members based on the specified criteria.
 *
 * Special attention is given to verifying that role filtering (member vs project-lead), status filtering (active vs deactivated), and combined filtering all work correctly. Search functionality is tested for case-insensitivity, and sorting is validated across multiple fields (role, employee_name, created_at) in both ascending and descending orders.
 *
 * 1. Authenticate as member to access project member listing.
 * 2. Create organization context for test data isolation.
 * 3. Create a project within the organization.
 * 4. Create multiple employees with different statuses (active, deactivated).
 * 5. Assign employees to the project with mixed roles (member, project-lead).
 * 6. Test role filtering by 'member' and verify only member-role employees are returned.
 * 7. Test role filtering by 'project-lead' and verify only project-lead employees are returned.
 * 8. Test status filtering by 'active' and verify only active employees are returned.
 * 9. Test status filtering by 'deactivated' and verify only deactivated employees are returned.
 * 10. Test combined filtering by role='member' AND status='active'.
 * 11. Test search filtering by employee name substring with case-insensitivity.
 * 12. Test sorting by role, employee_name, and created_at in both directions.
 */
export async function test_api_project_member_filtering_by_role_and_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create project
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 4. Create multiple employees with different statuses
  const activeEmployee1 =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      {
        body: {
          status: "active",
        },
      },
    );
  typia.assert(activeEmployee1);
  const activeEmployee2 =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      {
        body: {
          status: "active",
        },
      },
    );
  typia.assert(activeEmployee2);
  const deactivatedEmployee1 =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      {
        body: {
          status: "deactivated",
        },
      },
    );
  typia.assert(deactivatedEmployee1);
  const deactivatedEmployee2 =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      {
        body: {
          status: "deactivated",
        },
      },
    );
  typia.assert(deactivatedEmployee2);
  // 5. Assign employees to project with mixed roles
  // Active employees: one as member, one as project-lead
  await generate_random_hrm_time_track_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        employee_id: activeEmployee1.id,
        role: "member",
      },
    },
  );
  await generate_random_hrm_time_track_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        employee_id: activeEmployee2.id,
        role: "project-lead",
      },
    },
  );
  // Deactivated employees: one as member, one as project-lead
  await generate_random_hrm_time_track_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        employee_id: deactivatedEmployee1.id,
        role: "member",
      },
    },
  );
  await generate_random_hrm_time_track_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        employee_id: deactivatedEmployee2.id,
        role: "project-lead",
      },
    },
  );
  // 6. Test role filtering by 'member'
  const memberRoleResult =
    await api.functional.hrmTimeTrack.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          role: "member",
        },
      },
    );
  typia.assert(memberRoleResult);
  TestValidator.equals("member role count", memberRoleResult.data.length, 2);
  TestValidator.equals(
    "all are member role",
    memberRoleResult.data.every((m) => m.role === "member"),
    true,
  );
  // 7. Test role filtering by 'project-lead'
  const leadRoleResult =
    await api.functional.hrmTimeTrack.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          role: "project-lead",
        },
      },
    );
  typia.assert(leadRoleResult);
  TestValidator.equals(
    "project-lead role count",
    leadRoleResult.data.length,
    2,
  );
  TestValidator.equals(
    "all are project-lead role",
    leadRoleResult.data.every((m) => m.role === "project-lead"),
    true,
  );
  // 8. Test status filtering by 'active'
  const activeStatusResult =
    await api.functional.hrmTimeTrack.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          status: "active",
        },
      },
    );
  typia.assert(activeStatusResult);
  TestValidator.equals(
    "active status count",
    activeStatusResult.data.length,
    2,
  );
  TestValidator.equals(
    "all are active status",
    activeStatusResult.data.every((m) => m.employee.status === "active"),
    true,
  );
  // 9. Test status filtering by 'deactivated'
  const deactivatedStatusResult =
    await api.functional.hrmTimeTrack.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          status: "deactivated",
        },
      },
    );
  typia.assert(deactivatedStatusResult);
  TestValidator.equals(
    "deactivated status count",
    deactivatedStatusResult.data.length,
    2,
  );
  TestValidator.equals(
    "all are deactivated status",
    deactivatedStatusResult.data.every(
      (m) => m.employee.status === "deactivated",
    ),
    true,
  );
  // 10. Test combined filtering: role='member' AND status='active'
  const combinedResult =
    await api.functional.hrmTimeTrack.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          role: "member",
          status: "active",
        },
      },
    );
  typia.assert(combinedResult);
  TestValidator.equals("combined filter count", combinedResult.data.length, 1);
  TestValidator.equals(
    "combined filter matches criteria",
    combinedResult.data.every(
      (m) => m.role === "member" && m.employee.status === "active",
    ),
    true,
  );
  // 11. Test search filtering by employee name substring
  const searchName = activeEmployee1.member.email.split("@")[0];
  const searchResult =
    await api.functional.hrmTimeTrack.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          search: searchName,
        },
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search returns results",
    searchResult.data.length > 0,
  );
  TestValidator.equals(
    "search matches name",
    searchResult.data.every((m) =>
      m.employee.member.email.toLowerCase().includes(searchName.toLowerCase()),
    ),
    true,
  );
  // 12. Test sorting by role (asc)
  const sortByRoleAsc =
    await api.functional.hrmTimeTrack.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          sort: "role",
          sortOrder: "asc",
        },
      },
    );
  typia.assert(sortByRoleAsc);
  TestValidator.predicate("role asc sorted correctly", () => {
    for (let i = 1; i < sortByRoleAsc.data.length; i++) {
      if (sortByRoleAsc.data[i - 1].role > sortByRoleAsc.data[i].role) {
        return false;
      }
    }
    return true;
  });
  // 12. Test sorting by role (desc)
  const sortByRoleDesc =
    await api.functional.hrmTimeTrack.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          sort: "role",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(sortByRoleDesc);
  TestValidator.predicate("role desc sorted correctly", () => {
    for (let i = 1; i < sortByRoleDesc.data.length; i++) {
      if (sortByRoleDesc.data[i - 1].role < sortByRoleDesc.data[i].role) {
        return false;
      }
    }
    return true;
  });
  // 12. Test sorting by employee_name (asc)
  const sortByNameAsc =
    await api.functional.hrmTimeTrack.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          sort: "employee_name",
          sortOrder: "asc",
        },
      },
    );
  typia.assert(sortByNameAsc);
  TestValidator.predicate("employee_name asc sorted correctly", () => {
    for (let i = 1; i < sortByNameAsc.data.length; i++) {
      const prevName =
        sortByNameAsc.data[i - 1].employee.member.email.toLowerCase();
      const currName =
        sortByNameAsc.data[i].employee.member.email.toLowerCase();
      if (prevName > currName) {
        return false;
      }
    }
    return true;
  });
  // 12. Test sorting by employee_name (desc)
  const sortByNameDesc =
    await api.functional.hrmTimeTrack.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          sort: "employee_name",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(sortByNameDesc);
  TestValidator.predicate("employee_name desc sorted correctly", () => {
    for (let i = 1; i < sortByNameDesc.data.length; i++) {
      const prevName =
        sortByNameDesc.data[i - 1].employee.member.email.toLowerCase();
      const currName =
        sortByNameDesc.data[i].employee.member.email.toLowerCase();
      if (prevName < currName) {
        return false;
      }
    }
    return true;
  });
  // 12. Test sorting by created_at (asc)
  const sortByCreatedAsc =
    await api.functional.hrmTimeTrack.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          sort: "created_at",
          sortOrder: "asc",
        },
      },
    );
  typia.assert(sortByCreatedAsc);
  TestValidator.predicate("created_at asc sorted correctly", () => {
    for (let i = 1; i < sortByCreatedAsc.data.length; i++) {
      const prevDate = new Date(
        sortByCreatedAsc.data[i - 1].created_at,
      ).getTime();
      const currDate = new Date(sortByCreatedAsc.data[i].created_at).getTime();
      if (prevDate > currDate) {
        return false;
      }
    }
    return true;
  });
  // 12. Test sorting by created_at (desc)
  const sortByCreatedDesc =
    await api.functional.hrmTimeTrack.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          sort: "created_at",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(sortByCreatedDesc);
  TestValidator.predicate("created_at desc sorted correctly", () => {
    for (let i = 1; i < sortByCreatedDesc.data.length; i++) {
      const prevDate = new Date(
        sortByCreatedDesc.data[i - 1].created_at,
      ).getTime();
      const currDate = new Date(sortByCreatedDesc.data[i].created_at).getTime();
      if (prevDate < currDate) {
        return false;
      }
    }
    return true;
  });
}
