import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test project list retrieval with member authentication and organization-scoped data.
 *
 * Validates the project listing functionality for an authenticated member within their organization. The test creates mock projects with different statuses and verifies that the API returns paginated results with correct metadata, data structure, and business logic for time tracking aggregations. Special attention is given to verifying that new projects have zero hours and counts, and that the response structure matches expected DTOs.
 *
 * 1. Member authentication: Creates member account which automatically generates organization.
 * 2. Mock project creation: Generates 3 projects with different statuses (active, archived, completed) and validates data structure.
 * 3. List retrieval: Calls PATCH /hrmPlatform/member/projects without filters to get all projects.
 * 4. Response validation: Verifies pagination metadata, project summaries, and time tracking aggregates.
 */
export async function test_api_project_list_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.alphabets(3),
    },
  });
  typia.assert(memberAuthorized);
  // 2. Create mock projects
  const mockProjects = ArrayUtil.repeat(
    3,
    (index) =>
      ({
        id: typia.random<string & tags.Format<"uuid">>(),
        name: `${RandomGenerator.name()} Project ${index + 1}`,
        status: ["active", "archived", "completed"][index] as
          | "active"
          | "archived"
          | "completed",
        color_code: `#${RandomGenerator.alphabets(6)}`,
        budget_hours: null,
        start_date: null,
        end_date: null,
        description: null,
        total_hours: 0,
        billable_hours: 0,
        non_billable_hours: 0,
        timelog_count: 0,
        employee_count: 0,
        budget_utilization: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }) satisfies IHrmPlatformProject.ISummary,
  );
  // 3. List retrieval
  const response = await api.functional.hrmPlatform.member.projects.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(response);
  // 4. Validate pagination
  TestValidator.equals("pagination current", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 100);
  TestValidator.equals(
    "pagination records",
    response.pagination.records,
    mockProjects.length,
  );
  TestValidator.equals("pagination pages", response.pagination.pages, 1);
  // 5. Validate data contains all projects
  TestValidator.equals(
    "data length",
    response.data.length,
    mockProjects.length,
  );
  // 6. Validate each project structure and values
  for (const [index, mockProject] of mockProjects.entries()) {
    const project = response.data[index];
    typia.assert(project);
    TestValidator.equals("project id", project.id, mockProject.id);
    TestValidator.equals("project name", project.name, mockProject.name);
    TestValidator.equals("project status", project.status, mockProject.status);
    TestValidator.equals(
      "project color_code",
      project.color_code,
      mockProject.color_code,
    );
    TestValidator.equals("project total_hours", project.total_hours, 0);
    TestValidator.equals("project billable_hours", project.billable_hours, 0);
    TestValidator.equals(
      "project non_billable_hours",
      project.non_billable_hours,
      0,
    );
    TestValidator.equals("project timelog_count", project.timelog_count, 0);
    TestValidator.equals("project employee_count", project.employee_count, 0);
    TestValidator.equals(
      "project created_at valid",
      project.created_at,
      mockProject.created_at,
    );
    TestValidator.equals(
      "project updated_at valid",
      project.updated_at,
      mockProject.updated_at,
    );
  }
}