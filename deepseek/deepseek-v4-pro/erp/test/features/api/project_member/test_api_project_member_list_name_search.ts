import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
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
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

/**
 * Test project member listing with free-text name search using trigram similarity.
 *
 * Verifies that the project member index endpoint correctly filters members by partial display name matches. The test creates two employees with distinct display names, assigns both to a project, then searches with a substring matching only one employee's display name. It validates that the matching member is returned with complete profile data while the non-matching member is excluded.
 *
 * Trigram similarity tolerance is confirmed by testing with a slightly shifted partial substring that still matches the target employee. Pagination metadata is validated for correctness.
 *
 * 1. Main member registers and becomes the project owner.
 * 2. Two distinct members register with unique display names.
 * 3. Main member invites both as employees into the organization.
 * 4. Main member creates a project and assigns both employees as members.
 * 5. Search by partial substring of employee 1's display name.
 * 6. Validate only employee 1 appears, employee 2 is excluded.
 * 7. Validate complete employee profile and membership metadata.
 * 8. Validate fuzzy matching with a slightly shifted substring.
 */
export async function test_api_project_member_list_name_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the main member who will manage the project
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: { display_name: "MainAdministrator" },
  });
  // 2. Register two employees with distinctive display names
  const employee1Connection: api.IConnection = { host: connection.host };
  const employee1Member = await authorize_member_join(employee1Connection, {
    body: { display_name: "AliceAnderson" },
  });
  const employee2Connection: api.IConnection = { host: connection.host };
  const employee2Member = await authorize_member_join(employee2Connection, {
    body: { display_name: "BobBenjamin" },
  });
  // 3. Invite both members as employees into the organization
  const employee1 = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    {
      body: { email: employee1Member.email },
    },
  );
  typia.assert(employee1);
  const employee2 = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    {
      body: { email: employee2Member.email },
    },
  );
  typia.assert(employee2);
  // 4. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 5. Assign both employees as project members
  await generate_random_erp_hrm_member_projects_members_create(
    memberConnection,
    {
      body: { erp_hrm_employee_id: employee1.id },
      params: { projectId: project.id },
    },
  );
  await generate_random_erp_hrm_member_projects_members_create(
    memberConnection,
    {
      body: { erp_hrm_employee_id: employee2.id },
      params: { projectId: project.id },
    },
  );
  // 6. Search with partial substring matching only employee 1
  const searchTerm = employee1Member.display_name.substring(0, 5);
  const result = await api.functional.erpHrm.member.projects.members.index(
    memberConnection,
    {
      projectId: project.id,
      body: {
        search: searchTerm,
      } satisfies IErpHrmProjectMember.IRequest,
    },
  );
  typia.assert(result);
  // 7. Validate search correctly includes matching member
  TestValidator.predicate(
    "at least one matching result",
    result.data.length >= 1,
  );
  const hasMatchingEmployee = result.data.some(
    (m) => m.employee.member.display_name === employee1Member.display_name,
  );
  TestValidator.predicate(
    "matching employee found in results",
    hasMatchingEmployee,
  );
  // 8. Validate non-matching employee is excluded
  const hasNonMatchingEmployee = result.data.some(
    (m) => m.employee.member.display_name === employee2Member.display_name,
  );
  TestValidator.predicate(
    "non-matching employee excluded",
    !hasNonMatchingEmployee,
  );
  // 9. Validate pagination metadata
  TestValidator.predicate(
    "pagination records count correct",
    result.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages valid",
    result.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination current page valid",
    result.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    result.pagination.limit >= 1,
  );
  // 10. Validate matched member's complete profile and membership metadata
  const matched = result.data.find(
    (m) => m.employee.member.display_name === employee1Member.display_name,
  );
  TestValidator.predicate("matched member exists", matched !== undefined);
  if (matched) {
    TestValidator.equals(
      "employee display name matches",
      matched.employee.member.display_name,
      employee1Member.display_name,
    );
    TestValidator.equals(
      "employee email matches",
      matched.employee.member.email,
      employee1Member.email,
    );
    TestValidator.predicate(
      "membership role is valid",
      matched.role === "member" || matched.role === "project-lead",
    );
    TestValidator.predicate(
      "membership joined_at is present",
      matched.joined_at.length > 0,
    );
    TestValidator.predicate(
      "employee employment_type exists",
      matched.employee.employment_type.length > 0,
    );
    TestValidator.predicate(
      "employee status exists",
      matched.employee.status.length > 0,
    );
    TestValidator.predicate(
      "employee member id exists",
      matched.employee.member.id.length > 0,
    );
  }
  // 11. Verify trigram fuzzy matching tolerance with a shifted substring
  const fuzzyTerm = employee1Member.display_name.substring(2, 7);
  const fuzzyResult = await api.functional.erpHrm.member.projects.members.index(
    memberConnection,
    {
      projectId: project.id,
      body: {
        search: fuzzyTerm,
      } satisfies IErpHrmProjectMember.IRequest,
    },
  );
  typia.assert(fuzzyResult);
  TestValidator.predicate(
    "fuzzy search finds matching employee",
    fuzzyResult.data.some(
      (m) => m.employee.member.display_name === employee1Member.display_name,
    ),
  );
}
