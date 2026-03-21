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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProjectMember";
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

export async function test_api_project_filter_by_status_exact_match(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create projects with different statuses
  const activeProject = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        status: "active",
      },
    },
  );
  typia.assert(activeProject);
  const archivedProject = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        status: "archived",
      },
    },
  );
  typia.assert(archivedProject);
  const completedProject = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        status: "completed",
      },
    },
  );
  typia.assert(completedProject);
  // 3. Filter projects by status='active' using exact match
  const response = await api.functional.erpHrm.member.projects.index(
    memberConnection,
    {
      body: {
        status: "active",
      },
    },
  );
  typia.assert(response);
  // Validate: All returned projects should have status='active'
  TestValidator.equals("has data", response.data.length > 0, true);
  for (const project of response.data) {
    TestValidator.equals("status exact match", project.status, "active");
  }
  // Validate: Non-active projects should NOT be in response
  const activeIds = response.data.map((p) => p.id);
  TestValidator.equals(
    "archived not in response",
    activeIds.includes(archivedProject.id),
    false,
  );
  TestValidator.equals(
    "completed not in response",
    activeIds.includes(completedProject.id),
    false,
  );
  // Validate: Active project should be in response
  TestValidator.equals(
    "active project in response",
    activeIds.includes(activeProject.id),
    true,
  );
  // Validate: Pagination metadata exists
  TestValidator.predicate("has pagination", response.pagination !== undefined);
}
