import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

// Complete project type with id and name
interface IErpHrmProjectComplete extends IErpHrmProject {
  id: string;
  name: string;
}

export async function test_api_timer_retrieval_with_active_timer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create organization (member who creates org becomes owner/employee)
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        currency: "USD",
        timezone: "Asia/Seoul",
        fiscalStartMonth: 1,
      },
    },
  );
  typia.assert(organization);
  // 3. Create project
  const projectRaw = await generate_random_erp_hrm_admin_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color: "#FF5733",
        status: "active",
      },
    },
  );
  typia.assert(projectRaw);
  const project = projectRaw as IErpHrmProjectComplete;
  // 4. Add member as project member
  // The member who created the org is the owner and should have an employee record
  // Use the owner's ID (member ID) - the system should link this to the employee
  const projectMember =
    await generate_random_erp_hrm_admin_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          employeeId: organization.owner.id,
          assignedRole: "member",
        },
      },
    );
  typia.assert(projectMember);
  // 5. Start a timer
  const timer = await generate_random_erp_hrm_member_timers_create(
    memberConnection,
    {
      body: {
        erpHrmProjectId: project.id,
      },
    },
  );
  typia.assert(timer);
  // 6. Retrieve timer records using PATCH /erpHrm/member/timers
  const timerResponse = await api.functional.erpHrm.member.timers.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(timerResponse);
  // 7. Validate response has pagination metadata
  TestValidator.equals(
    "has pagination",
    timerResponse.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "pagination has current page",
    timerResponse.pagination.current !== undefined,
  );
  TestValidator.predicate(
    "pagination has limit",
    timerResponse.pagination.limit !== undefined,
  );
  TestValidator.predicate(
    "pagination has records count",
    timerResponse.pagination.records !== undefined,
  );
  TestValidator.predicate(
    "pagination has pages count",
    timerResponse.pagination.pages !== undefined,
  );
  // 8. Validate response has data array
  TestValidator.equals(
    "has data array",
    Array.isArray(timerResponse.data),
    true,
  );
  TestValidator.predicate(
    "has at least one timer",
    timerResponse.data.length >= 1,
  );
  // 9. Find the timer we just created and validate its properties
  const createdTimer = timerResponse.data.find((t) => t.id === timer.id);
  TestValidator.notEquals("timer found in response", createdTimer, undefined);
  TestValidator.equals("project matches", createdTimer!.project.id, project.id);
  TestValidator.equals(
    "project name matches",
    createdTimer!.project.name,
    project.name,
  );
  TestValidator.predicate(
    "has startedAt timestamp",
    createdTimer!.startedAt !== undefined && createdTimer!.startedAt.length > 0,
  );
  // Validate the startedAt timestamp is a valid ISO datetime
  const startedAtDate = new Date(createdTimer!.startedAt);
  TestValidator.predicate(
    "startedAt is valid date",
    !isNaN(startedAtDate.getTime()),
  );
}
