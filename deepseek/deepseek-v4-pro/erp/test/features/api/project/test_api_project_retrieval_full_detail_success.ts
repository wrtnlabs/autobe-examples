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

export async function test_api_project_retrieval_full_detail_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a project with all optional fields explicitly set
  const startDate = new Date().toISOString();
  const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        description: RandomGenerator.paragraph({ sentences: 4 }),
        budget_hours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >() satisfies number as number,
        start_date: startDate satisfies string as string,
        end_date: endDate satisfies string as string,
      },
    },
  );
  typia.assert(project);
  // 3. Retrieve the project by its ID
  const retrieved = await api.functional.erpHrm.member.projects.at(
    memberConnection,
    { projectId: project.id },
  );
  typia.assert(retrieved);
  // 4. Validate all fields match the creation result
  TestValidator.equals("id matches", retrieved.id, project.id);
  TestValidator.equals("name matches", retrieved.name, project.name);
  TestValidator.equals(
    "description matches",
    retrieved.description,
    project.description,
  );
  TestValidator.equals(
    "color_code matches",
    retrieved.color_code,
    project.color_code,
  );
  TestValidator.equals("status matches", retrieved.status, project.status);
  TestValidator.equals(
    "budget_hours matches",
    retrieved.budget_hours,
    project.budget_hours,
  );
  TestValidator.equals(
    "start_date matches",
    retrieved.start_date,
    project.start_date,
  );
  TestValidator.equals(
    "end_date matches",
    retrieved.end_date,
    project.end_date,
  );
  TestValidator.equals(
    "organization_id matches",
    retrieved.organization_id,
    project.organization_id,
  );
  TestValidator.equals(
    "created_at matches",
    retrieved.created_at,
    project.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrieved.updated_at,
    project.updated_at,
  );
  // 5. Validate relational arrays and aggregated metrics
  TestValidator.predicate(
    "projectMembers is array",
    Array.isArray(retrieved.projectMembers),
  );
  TestValidator.predicate("tasks is array", Array.isArray(retrieved.tasks));
  TestValidator.predicate("timelogs_count >= 0", retrieved.timelogs_count >= 0);
  TestValidator.predicate("timers_count >= 0", retrieved.timers_count >= 0);
  TestValidator.equals(
    "timelogs_count is zero for new project",
    retrieved.timelogs_count,
    0,
  );
  TestValidator.equals(
    "timers_count is zero for new project",
    retrieved.timers_count,
    0,
  );
}
