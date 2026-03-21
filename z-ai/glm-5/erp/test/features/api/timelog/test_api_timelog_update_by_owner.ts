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

export async function test_api_timelog_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create member account (creates member, organization, employee)
  const memberAuth: IErpHrmMember.IAuthorized = await authorize_member_join(
    connection,
    {},
  );
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: memberAuth.token.access };
  // 2. Create an active project
  const project: IErpHrmProject =
    await generate_random_erp_hrm_member_projects_create(memberConnection, {
      body: {
        name: RandomGenerator.name(2),
        color_code: "#FF5733",
      },
    });
  typia.assert(project);
  // 3. Create a timelog entry
  const originalTimelog: IErpHrmTimelog =
    await generate_random_erp_hrm_member_timelogs_create(memberConnection, {
      body: {
        project_id: project.id,
        date: new Date().toISOString(),
        duration: 60,
        description: "Initial work on project",
        billable: true,
      },
    });
  typia.assert(originalTimelog);
  // Store original values for comparison
  const originalUpdatedAt: string = originalTimelog.updated_at;
  // 4. Update the timelog
  const updateBody: IErpHrmTimelog.IUpdate = {
    duration: 90,
    description: "Updated work description",
    billable: false,
  };
  const updatedTimelog: IErpHrmTimelog =
    await api.functional.erpHrm.member.timelogs.update(memberConnection, {
      timelogId: originalTimelog.id,
      body: updateBody,
    });
  typia.assert(updatedTimelog);
  // 5. Validate the update
  TestValidator.equals("duration updated", updatedTimelog.duration, 90);
  TestValidator.equals(
    "description updated",
    updatedTimelog.description,
    "Updated work description",
  );
  TestValidator.equals("billable updated", updatedTimelog.billable, false);
  TestValidator.equals("id unchanged", updatedTimelog.id, originalTimelog.id);
  TestValidator.equals(
    "project unchanged",
    updatedTimelog.project.id,
    project.id,
  );
  // Verify updated_at timestamp has been refreshed
  TestValidator.predicate(
    "updated_at is newer",
    new Date(updatedTimelog.updated_at).getTime() >
      new Date(originalUpdatedAt).getTime(),
  );
  // Verify employee information matches authenticated user
  TestValidator.equals(
    "employee member matches",
    updatedTimelog.employee.member.id,
    memberAuth.id,
  );
}
