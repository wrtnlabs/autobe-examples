import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
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

export async function test_api_project_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member joins and creates their first organization
  // The member becomes the owner with full permissions including 'project:manage'
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // Step 2: Create a project with required fields only
  const projectName = RandomGenerator.paragraph({ sentences: 2 });
  const colorCode = "#FF5733";
  const projectInput = {
    name: projectName,
    color_code: colorCode,
  } satisfies IErpHrmProject.ICreate;
  const project = await api.functional.erpHrm.member.projects.create(
    memberConnection,
    { body: projectInput },
  );
  typia.assert(project);
  // Step 3: Verify business logic
  // status is automatically set to 'active'
  TestValidator.equals("status is active", project.status, "active");
  // Name and colorCode match input values
  TestValidator.equals("name matches", project.name, projectName);
  TestValidator.equals("colorCode matches", project.colorCode, colorCode);
  // Optional fields are null (business logic, not type validation)
  TestValidator.equals("description is null", project.description, null);
  TestValidator.equals("budgetHours is null", project.budgetHours, null);
  TestValidator.equals("startDate is null", project.startDate, null);
  TestValidator.equals("endDate is null", project.endDate, null);
  // Tasks array is empty
  TestValidator.equals("tasks is empty", project.tasks.length, 0);
  // Counts are zero
  TestValidator.equals("timelogsCount is zero", project.timelogsCount, 0);
  TestValidator.equals("membersCount is zero", project.membersCount, 0);
  // deletedAt is null (business logic - soft delete field)
  TestValidator.equals("deletedAt is null", project.deletedAt, null);
}
