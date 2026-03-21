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
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

export async function test_api_timer_start_with_project_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member via /auth/member/join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Create a project via POST /erpHrm/member/projects with valid name, color, and status
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#3A6EA5",
        status: "active",
      },
    },
  );
  typia.assert(project);
  TestValidator.equals("project status is active", project.status, "active");
  // 3. Assign the authenticated employee as a project member via POST /erpHrm/member/projects/{projectId}/members
  const projectMember =
    await api.functional.erpHrm.member.projects.members.create(
      memberConnection,
      {
        projectId: project.id,
        body: {
          name: authorized.display_name,
          color: "#FF5733",
          status: "active",
        } satisfies IErpHrmProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  TestValidator.equals("project id matches", projectMember.id, project.id);
  // 4. Start timer via POST /erpHrm/member/timers with valid project_id
  const timer = await api.functional.erpHrm.member.timers.create(
    memberConnection,
    {
      body: {
        erp_hrm_project_id: project.id,
        description: "Testing timer with project assignment",
      } satisfies IErpHrmTimer.ICreate,
    },
  );
  typia.assert(timer);
  // Validation points:
  // - Response contains valid timer with id, started_at timestamp, and associated project
  TestValidator.predicate("timer has valid id", !!timer.id);
  TestValidator.predicate("timer has started_at timestamp", !!timer.started_at);
  TestValidator.predicate("timer has employee", !!timer.employee);
  TestValidator.predicate("timer has project", !!timer.project);
  // - started_at is automatically set to current time (should be within a few seconds)
  const startedAt = new Date(timer.started_at);
  const now = new Date();
  const diffMs = Math.abs(now.getTime() - startedAt.getTime());
  TestValidator.predicate(
    "started_at is recent (within 5 seconds)",
    diffMs < 5000,
  );
  // - elapsed_time_ms is computed and positive
  TestValidator.predicate(
    "elapsed_time_ms is positive",
    (timer.elapsed_time_ms ?? 0) >= 0,
  );
  // - Project association is correct
  TestValidator.equals("project id matches", timer.project.id, project.id);
  // - Employee relationship is correctly set from session context
  TestValidator.equals(
    "employee member id matches",
    timer.employee.member.id,
    authorized.id,
  );
}