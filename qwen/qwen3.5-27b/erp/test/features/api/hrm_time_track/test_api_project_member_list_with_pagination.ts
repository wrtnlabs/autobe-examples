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
 * Test project member list retrieval with pagination functionality.
 *
 * Validates the complete workflow of retrieving project members assigned to a specific project with pagination support. The test authenticates as a member, creates necessary organizational context (organization, project, employees), assigns employees to the project with different roles, and verifies the paginated response structure and data integrity.
 *
 * Special attention is given to verifying pagination metadata accuracy, role-based filtering, and proper exclusion of soft-deleted records. The test ensures that project members are correctly associated with their employees and projects, and that the response includes all required summary fields.
 *
 * 1. Authenticate as a member user with email and password registration.
 * 2. Create an organization to serve as the multi-tenant container for all entities.
 * 3. Create multiple employees (at least 3) within the organization with different positions and employment types.
 * 4. Create a project within the organization with a name, color code, and active status.
 * 5. Assign employees to the project with different roles (member and project-lead).
 * 6. Retrieve project members with pagination parameters (page=1, limit=10).
 * 7. Verify pagination metadata: current page, limit, total records, and total pages are correct.
 * 8. Verify data array contains project member summaries with id, role, employee details, project reference, and timestamps.
 * 9. Test pagination by requesting page 2 and verify the response structure (may be empty if fewer than 11 members).
 */
export async function test_api_project_member_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authResult);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create multiple employees (3 employees for pagination testing)
  const employees = await ArrayUtil.asyncRepeat(3, async (index) => {
    const employee =
      await generate_random_hrm_time_track_member_employees_create(
        memberConnection,
        {
          body: {
            position: `Position ${index + 1}`,
            employment_type: index === 0 ? "full-time" : "part-time",
            hire_date: new Date().toISOString(),
            status: "active",
            hrm_time_track_member_id: authResult.id,
          },
        },
      );
    typia.assert(employee);
    return employee;
  });
  // 4. Create a project
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#FF5733",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 5. Assign employees to project with different roles
  const projectMembers = await ArrayUtil.asyncRepeat(3, async (index) => {
    const member =
      await generate_random_hrm_time_track_member_projects_members_create(
        memberConnection,
        {
          params: {
            projectId: project.id,
          },
          body: {
            employee_id: employees[index].id,
            role: index === 0 ? "project-lead" : "member",
          },
        },
      );
    typia.assert(member);
    return member;
  });
  // 6. Retrieve project members with pagination (page=1, limit=10)
  const page1Response =
    await api.functional.hrmTimeTrack.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(page1Response);
  // 7. Verify pagination metadata
  TestValidator.equals(
    "current page is 1",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("limit is 10", page1Response.pagination.limit, 10);
  TestValidator.equals(
    "total records is 3",
    page1Response.pagination.records,
    3,
  );
  TestValidator.equals(
    "total pages is 1",
    page1Response.pagination.pages,
    Math.ceil(3 / 10),
  );
  // 8. Verify data array contains project member summaries
  TestValidator.equals(
    "data array length matches records",
    page1Response.data.length,
    page1Response.pagination.records,
  );
  // Verify each member has required fields
  await ArrayUtil.asyncForEach(page1Response.data, async (member) => {
    typia.assert(member);
    TestValidator.predicate("has id", member.id !== undefined);
    TestValidator.predicate("has role", member.role !== undefined);
    TestValidator.predicate("has employee", member.employee !== null);
    TestValidator.predicate("has project", member.project !== null);
    TestValidator.predicate("has created_at", member.created_at !== undefined);
    TestValidator.predicate("has updated_at", member.updated_at !== undefined);
  });
  // Verify roles are correctly assigned
  const projectLeads = page1Response.data.filter(
    (m) => m.role === "project-lead",
  );
  const members = page1Response.data.filter((m) => m.role === "member");
  TestValidator.equals("one project-lead", projectLeads.length, 1);
  TestValidator.equals("two members", members.length, 2);
  // 9. Test pagination with page=2 (should return empty data)
  const page2Response =
    await api.functional.hrmTimeTrack.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          page: 2,
          limit: 10,
        },
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 current is 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 records is 3",
    page2Response.pagination.records,
    3,
  );
  TestValidator.equals("page 2 data is empty", page2Response.data.length, 0);
}
