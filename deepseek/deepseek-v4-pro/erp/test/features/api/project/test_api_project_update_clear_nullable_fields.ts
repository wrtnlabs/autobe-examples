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

export async function test_api_project_update_clear_nullable_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create fully populated project with all nullable fields set
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        description: RandomGenerator.paragraph({ sentences: 3 }),
        budget_hours: 100,
        start_date: new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  );
  typia.assert(project);
  // Verify initial state — all nullable fields are populated
  TestValidator.predicate(
    "initial description is not null",
    project.description !== null,
  );
  TestValidator.predicate(
    "initial budget_hours is not null",
    project.budget_hours !== null,
  );
  TestValidator.predicate(
    "initial start_date is not null",
    project.start_date !== null,
  );
  TestValidator.predicate(
    "initial end_date is not null",
    project.end_date !== null,
  );
  // 3. Update project — clear all nullable fields while preserving required fields
  const updated = await api.functional.erpHrm.member.projects.update(
    memberConnection,
    {
      projectId: project.id,
      body: {
        name: project.name,
        color_code: project.color_code,
        description: null,
        budget_hours: null,
        start_date: null,
        end_date: null,
      } satisfies IErpHrmProject.IUpdate,
    },
  );
  typia.assert(updated);
  // 4. Validate nullable fields are cleared to null
  TestValidator.equals("description cleared", updated.description, null);
  TestValidator.equals("budget_hours cleared", updated.budget_hours, null);
  TestValidator.equals("start_date cleared", updated.start_date, null);
  TestValidator.equals("end_date cleared", updated.end_date, null);
  // 5. Validate required fields remain unchanged
  TestValidator.equals("name unchanged", updated.name, project.name);
  TestValidator.equals(
    "color_code unchanged",
    updated.color_code,
    project.color_code,
  );
}
