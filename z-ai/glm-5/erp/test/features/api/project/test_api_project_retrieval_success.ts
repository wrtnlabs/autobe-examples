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

export async function test_api_project_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create authenticated member with organization
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Setup: Create a project within the organization
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#FF5733",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        budget_hours: typia.random<number & tags.Minimum<0>>(),
      },
    },
  );
  typia.assert(project);
  // Execute: Retrieve the project by ID
  const retrieved = await api.functional.erpHrm.member.projects.at(
    memberConnection,
    {
      projectId: project.id,
    },
  );
  typia.assert(retrieved);
  // Validate: Project details match
  TestValidator.equals("project id", retrieved.id, project.id);
  TestValidator.equals("project name", retrieved.name, project.name);
  TestValidator.equals(
    "description",
    retrieved.description,
    project.description,
  );
  TestValidator.equals("color code", retrieved.colorCode, project.colorCode);
  TestValidator.equals("status is active", retrieved.status, "active");
  TestValidator.equals(
    "budget hours",
    retrieved.budgetHours,
    project.budgetHours,
  );
  TestValidator.equals("start date", retrieved.startDate, project.startDate);
  TestValidator.equals("end date", retrieved.endDate, project.endDate);
  TestValidator.equals("deleted at is null", retrieved.deletedAt, null);
  // Validate: Organization details
  TestValidator.equals(
    "organization id",
    retrieved.organization.id,
    project.organization.id,
  );
  TestValidator.equals(
    "organization name",
    retrieved.organization.name,
    project.organization.name,
  );
  // Validate: Tasks array is present
  TestValidator.predicate("tasks is array", Array.isArray(retrieved.tasks));
  // Validate: TimelogsCount is 0 for new project
  TestValidator.equals("timelogs count is 0", retrieved.timelogsCount, 0);
  // Validate: MembersCount is at least 1 (creator)
  TestValidator.predicate(
    "members count at least 1",
    retrieved.membersCount >= 1,
  );
}
