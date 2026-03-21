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
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_timelog_own_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins the platform (creates account, organization, employee record)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a project within the organization
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create a timelog entry for the project
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
      },
    },
  );
  typia.assert(timelog);
  // 4. Retrieve the timelog by ID
  const retrieved = await api.functional.erpHrm.member.timelogs.at(
    memberConnection,
    {
      timelogId: timelog.id,
    },
  );
  typia.assert(retrieved);
  // 5. Verify the timelog ID matches
  TestValidator.equals("timelog ID matches", retrieved.id, timelog.id);
  // 6. Verify the employee owns this timelog
  TestValidator.equals(
    "employee member ID matches",
    retrieved.employee.member.id,
    member.id,
  );
  // 7. Verify the project matches
  TestValidator.equals("project ID matches", retrieved.project.id, project.id);
  // 8. Verify soft-delete filter (deleted_at should be null)
  TestValidator.equals("deleted_at is null", retrieved.deleted_at, null);
  // 9. Verify all timelog fields are properly populated
  TestValidator.predicate("date is valid", retrieved.date.length > 0);
  TestValidator.predicate("duration is positive", retrieved.duration > 0);
  // 10. Verify related entities are populated
  TestValidator.predicate(
    "employee has member profile",
    retrieved.employee.member.displayName.length > 0,
  );
  TestValidator.predicate(
    "project has name",
    retrieved.project.name.length > 0,
  );
  TestValidator.predicate(
    "project has status",
    retrieved.project.status.length > 0,
  );
  TestValidator.predicate(
    "project has color code",
    retrieved.project.colorCode.length > 0,
  );
}
