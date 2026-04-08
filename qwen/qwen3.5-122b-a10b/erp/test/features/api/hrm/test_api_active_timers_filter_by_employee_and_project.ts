import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmActiveTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActiveTimer";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmActiveTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmActiveTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_active_timers_create } from "../../../generate/generate_random_hrm_member_active_timers_create";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_projects_members_create } from "../../../generate/generate_random_hrm_member_projects_members_create";
import { prepare_random_hrm_active_timer } from "../../../prepare/prepare_random_hrm_active_timer";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_project_member } from "../../../prepare/prepare_random_hrm_project_member";

/**
 * Test retrieving active timer sessions with filtering by employee and project.
 *
 * Validates filtering capabilities for targeted time tracking visibility across the organization. This test ensures that active timer queries correctly filter results based on employee ID, project ID, and combined criteria while maintaining proper pagination metadata.
 *
 * The test creates multiple timer sessions across different employees and projects, then verifies that filtering returns only the expected subset of active timers. Pagination metadata is validated to ensure accurate record counts and page information.
 *
 * 1. Authenticate as member via join operation
 * 2. Generate organization ID for project creation
 * 3. Create two projects in the organization (Project A and Project B)
 * 4. Start an active timer for the member on Project A
 * 5. Call the active-timers index endpoint with filter: {employee_id: member_employee_id}
 * 6. Verify response contains only the timer from the member
 * 7. Call the active-timers index endpoint with filter: {project_id: project_b_id}
 * 8. Verify response contains no timers (no timer on Project B)
 * 9. Call the active-timers index endpoint with filters: {employee_id, project_id: project_a_id}
 * 10. Verify response contains only the matching timer
 * 11. Validate pagination metadata reflects filtered result count
 */
export async function test_api_active_timers_filter_by_employee_and_project(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Generate organization ID for project creation (member has no organizations after join)
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Create two projects
  const projectA =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: {
          organizationId: organizationId,
        },
        body: {
          name: RandomGenerator.name(),
          color_code: "#FF5733",
          status: "active",
        } satisfies IHrmProject.ICreate,
      },
    );
  typia.assert(projectA);
  const projectB =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: {
          organizationId: organizationId,
        },
        body: {
          name: RandomGenerator.name(),
          color_code: "#33FF57",
          status: "active",
        } satisfies IHrmProject.ICreate,
      },
    );
  typia.assert(projectB);
  // 4. Start active timer for member on Project A
  const timerA = await generate_random_hrm_member_active_timers_create(
    memberConnection,
    {
      body: {
        projectId: projectA.id,
        description: "Working on Project A",
      } satisfies IHrmActiveTimer.ICreate,
    },
  );
  typia.assert(timerA);
  // 5. Filter by employee_id - should return only timerA
  const filteredByEmployee =
    await api.functional.hrm.member.active_timers.index(memberConnection, {
      body: {
        employee_id: timerA.employee.id,
      } satisfies IHrmActiveTimer.IRequest,
    });
  typia.assert(filteredByEmployee);
  TestValidator.equals(
    "employee filter returns only employee's timers",
    filteredByEmployee.data.length,
    1,
  );
  TestValidator.equals(
    "filtered timer matches timerA",
    filteredByEmployee.data[0].id,
    timerA.id,
  );
  // 6. Filter by project_id (Project B) - should return empty (no timer on Project B)
  const filteredByProjectB =
    await api.functional.hrm.member.active_timers.index(memberConnection, {
      body: {
        project_id: projectB.id,
      } satisfies IHrmActiveTimer.IRequest,
    });
  typia.assert(filteredByProjectB);
  TestValidator.equals(
    "project filter returns no timers for Project B",
    filteredByProjectB.data.length,
    0,
  );
  // 7. Combined filter by employee_id and project_id (matching)
  const filteredCombined = await api.functional.hrm.member.active_timers.index(
    memberConnection,
    {
      body: {
        employee_id: timerA.employee.id,
        project_id: projectA.id,
      } satisfies IHrmActiveTimer.IRequest,
    },
  );
  typia.assert(filteredCombined);
  TestValidator.equals(
    "combined filter returns matching timer",
    filteredCombined.data.length,
    1,
  );
  TestValidator.equals(
    "combined filter matches timerA",
    filteredCombined.data[0].id,
    timerA.id,
  );
  // 8. Combined filter with non-matching project
  const filteredCombinedNonMatching =
    await api.functional.hrm.member.active_timers.index(memberConnection, {
      body: {
        employee_id: timerA.employee.id,
        project_id: projectB.id,
      } satisfies IHrmActiveTimer.IRequest,
    });
  typia.assert(filteredCombinedNonMatching);
  TestValidator.equals(
    "combined filter with non-matching project returns empty",
    filteredCombinedNonMatching.data.length,
    0,
  );
  // 9. Verify pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    filteredCombined.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    filteredCombined.pagination.limit > 0,
  );
  TestValidator.equals(
    "pagination records matches data length",
    filteredCombined.pagination.records,
    filteredCombined.data.length,
  );
}
