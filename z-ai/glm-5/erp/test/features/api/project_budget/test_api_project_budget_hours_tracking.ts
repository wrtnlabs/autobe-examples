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

export async function test_api_project_budget_hours_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins the platform (becomes organization owner)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a project initially without budget hours
  const project = await api.functional.erpHrm.member.projects.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#FF5733",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project);
  // Verify initial project has no budget hours
  TestValidator.equals(
    "initial budget hours should be null",
    project.budgetHours,
    null,
  );
  // 3. Update the project to set budget_hours to 100 hours
  const updatedProject1 = await api.functional.erpHrm.member.projects.update(
    memberConnection,
    {
      projectId: project.id,
      body: {
        budget_hours: 100,
      } satisfies IErpHrmProject.IUpdate,
    },
  );
  typia.assert(updatedProject1);
  // 4. Verify the response shows budget_hours with the specified value
  TestValidator.equals(
    "budget hours should be 100",
    updatedProject1.budgetHours,
    100,
  );
  TestValidator.equals(
    "project id should match",
    updatedProject1.id,
    project.id,
  );
  // 5. Update budget_hours to a different value (150 hours)
  const updatedProject2 = await api.functional.erpHrm.member.projects.update(
    memberConnection,
    {
      projectId: project.id,
      body: {
        budget_hours: 150,
      } satisfies IErpHrmProject.IUpdate,
    },
  );
  typia.assert(updatedProject2);
  // 6. Verify the new budget_hours value is correctly persisted
  TestValidator.equals(
    "budget hours should be updated to 150",
    updatedProject2.budgetHours,
    150,
  );
  TestValidator.equals(
    "project id should still match",
    updatedProject2.id,
    project.id,
  );
  TestValidator.predicate(
    "budget hours is positive",
    (updatedProject2.budgetHours ?? 0) > 0,
  );
}
