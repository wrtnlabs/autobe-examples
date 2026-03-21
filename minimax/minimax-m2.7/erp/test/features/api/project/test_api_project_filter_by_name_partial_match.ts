import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
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
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

/**
 * Test filtering projects by name with partial match (case-insensitive search).
 *
 * Steps:
 * 1. Authenticate as a member by calling POST /erpHrm/auth/member/join
 * 2. Create projects with different names (e.g., 'Mobile App Development', 'Web Platform Upgrade', 'API Integration')
 * 3. Call PATCH /erpHrm/member/projects with name filter containing partial text like 'Mobile'
 *
 * Validations:
 * - Response should only contain projects whose names contain the search term (case-insensitive)
 * - Projects with matching partial name should be returned
 * - Projects without matching names should NOT be included
 * - Name filter supports regex pattern matching
 */
export async function test_api_project_filter_by_name_partial_match(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create projects with different names
  const projectNames = [
    "Mobile App Development",
    "Web Platform Upgrade",
    "API Integration",
    "Mobile Backend Services",
    "Desktop Application",
  ];
  const createdProjects = await ArrayUtil.asyncMap(
    projectNames,
    async (name) => {
      const project = await generate_random_erp_hrm_member_projects_create(
        memberConnection,
        {
          body: {
            name: name,
            color: "#FF5733" satisfies string &
              tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
            status: "active" satisfies "active" | "archived" | "completed",
          } satisfies IErpHrmProjectMember.ICreate,
        },
      );
      return typia.assert(project);
    },
  );
  // 3. Filter projects by partial name "Mobile"
  const searchTerm = "Mobile";
  const filteredResponse = await api.functional.erpHrm.member.projects.index(
    memberConnection,
    {
      body: {
        name: searchTerm satisfies string & tags.Format<"regex">,
      } satisfies IErpHrmProjectMember.IRequest,
    },
  );
  typia.assert(filteredResponse);
  // Validate that response contains only projects with matching names
  const matchingNames = projectNames.filter((name) =>
    name.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const nonMatchingNames = projectNames.filter(
    (name) => !name.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  // Check that filtered results contain matching projects
  TestValidator.equals(
    "filtered projects count should match",
    filteredResponse.data.length,
    matchingNames.length,
  );
  // Verify each returned project has the search term in its name
  for (const project of filteredResponse.data) {
    TestValidator.predicate(
      `project "${project.name}" should contain "${searchTerm}"`,
      project.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }
  // Verify matching projects are included
  for (const matchingName of matchingNames) {
    TestValidator.predicate(
      `project "${matchingName}" should be in filtered results`,
      filteredResponse.data.some(
        (p) => p.name.toLowerCase() === matchingName.toLowerCase(),
      ),
    );
  }
  // Verify non-matching projects are NOT included
  for (const nonMatchingName of nonMatchingNames) {
    TestValidator.predicate(
      `project "${nonMatchingName}" should NOT be in filtered results`,
      !filteredResponse.data.some(
        (p) => p.name.toLowerCase() === nonMatchingName.toLowerCase(),
      ),
    );
  }
}
