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
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_timelog_update_by_manager_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create organization owner who can invite other members
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: `Owner_${RandomGenerator.alphabets(8)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuth);
  // 2. Create first project (initial project for timelog)
  const project1 = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {
      body: {
        name: `Project_${RandomGenerator.alphabets(8)}`,
        color_code: `#${RandomGenerator.alphabets(6)}`,
      },
    },
  );
  typia.assert(project1);
  // 3. Create second project (for reassignment)
  const project2 = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {
      body: {
        name: `Project_${RandomGenerator.alphabets(8)}`,
        color_code: `#${RandomGenerator.alphabets(6)}`,
      },
    },
  );
  typia.assert(project2);
  // 4. Create a timelog entry as the organization owner
  const originalDuration = 60;
  const originalDescription = RandomGenerator.paragraph({ sentences: 2 });
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    ownerConnection,
    {
      body: {
        project_id: project1.id,
        date: new Date().toISOString(),
        duration: originalDuration,
        description: originalDescription,
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // Store original employee info before update
  const originalEmployeeId = timelog.employee.id;
  // 5. Owner (with time:manage permission) updates the timelog
  const newDuration = 120;
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updateBody: IErpHrmTimelog.IUpdate = {
    projectId: project2.id,
    duration: newDuration,
    description: newDescription,
  };
  const updatedTimelog = await api.functional.erpHrm.member.timelogs.update(
    ownerConnection,
    {
      timelogId: timelog.id,
      body: updateBody,
    },
  );
  typia.assert(updatedTimelog);
  // 6. Verify the update was successful
  TestValidator.equals(
    "duration updated",
    updatedTimelog.duration,
    newDuration,
  );
  TestValidator.equals(
    "description updated",
    updatedTimelog.description,
    newDescription,
  );
  TestValidator.equals(
    "project updated",
    updatedTimelog.project.id,
    project2.id,
  );
  // 7. Verify employee ownership remains with original employee
  TestValidator.equals(
    "employee still shows original owner",
    updatedTimelog.employee.id,
    originalEmployeeId,
  );
}
