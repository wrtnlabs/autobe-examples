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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

/**
 * Test creating a project with only the minimal required fields.
 *
 * Validates that a member can create a project by providing only the required
 * display name and hex color code, without any optional fields. The test
 * verifies server-side behavior including automatic assignment of active
 * status, null values for omitted optional fields, and automatic timestamp
 * management.
 *
 * 1. Authenticate a new member via the join endpoint to obtain a valid session.
 * 2. Create a project providing only name and color_code, omitting all optional fields.
 * 3. Validate the created project has the correct name and active status.
 * 4. Confirm optional fields (description, budget_hours, start_date, end_date) are null.
 */
export async function test_api_project_create_minimal_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create project with only required fields (name and color_code)
  const projectName = RandomGenerator.paragraph({ sentences: 2 });
  const project = await api.functional.erpHrm.member.projects.create(
    memberConnection,
    {
      body: {
        name: projectName,
        color_code: "#1A2B3C",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Validate server-assigned values and business logic
  TestValidator.equals("project name matches input", project.name, projectName);
  TestValidator.equals("project status is active", project.status, "active");
  // 4. Verify optional fields are null when omitted
  TestValidator.equals("description is null", project.description, null);
  TestValidator.equals("budget_hours is null", project.budget_hours, null);
  TestValidator.equals("start_date is null", project.start_date, null);
  TestValidator.equals("end_date is null", project.end_date, null);
}
