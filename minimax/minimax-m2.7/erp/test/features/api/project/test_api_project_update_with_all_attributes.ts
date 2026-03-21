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

export async function test_api_project_update_with_all_attributes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create initial project
  const initialProject = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(initialProject);
  // 3. Prepare update data with all attributes
  const updateBody: IErpHrmProjectMember.IUpdate = {
    name: `Updated Project ${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    color: "#FF5733",
    status: "completed",
    budget_hours: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<1000>
    >(),
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
  // 4. Update the project
  const updatedProject = await api.functional.erpHrm.member.projects.update(
    memberConnection,
    {
      projectId: initialProject.id,
      body: updateBody,
    },
  );
  typia.assert(updatedProject);
  // 5. Validations
  TestValidator.equals("name updated", updatedProject.name, updateBody.name);
  TestValidator.equals(
    "description updated",
    updatedProject.description,
    updateBody.description,
  );
  TestValidator.equals("color updated", updatedProject.color, updateBody.color);
  TestValidator.equals(
    "status updated",
    updatedProject.status,
    updateBody.status,
  );
  TestValidator.equals(
    "budget_hours updated",
    updatedProject.budget_hours,
    updateBody.budget_hours,
  );
  TestValidator.equals(
    "start_date updated",
    updatedProject.start_date,
    updateBody.start_date,
  );
  TestValidator.equals(
    "end_date updated",
    updatedProject.end_date,
    updateBody.end_date,
  );
  // Validate updated_at timestamp is set (should be different from created_at)
  TestValidator.predicate(
    "updated_at is set",
    updatedProject.updated_at !== initialProject.created_at,
  );
  // Validate organization relationship unchanged
  TestValidator.equals(
    "organization unchanged",
    updatedProject.organization.id,
    initialProject.organization.id,
  );
}
