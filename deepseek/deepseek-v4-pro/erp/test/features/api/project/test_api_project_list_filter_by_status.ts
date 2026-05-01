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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProject";
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

/**
 * Test project list filtering by lifecycle status.
 *
 * Validates that the project list endpoint correctly filters projects based on their lifecycle status. Creates a new project which defaults to 'active' status, then queries with status='active' to verify the new project appears and all results are active. Queries with status='archived' to confirm only archived projects appear and the active project is excluded.
 *
 * 1. Member authenticates via join to establish session and organization context.
 * 2. A new project is created, which defaults to 'active' status.
 * 3. Project list is queried with status='active' filter.
 * 4. Validates all returned projects have status 'active' and the new project is included.
 * 5. Project list is queried with status='archived' filter.
 * 6. Validates all returned projects have status 'archived' and the active project is excluded.
 */
export async function test_api_project_list_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a new project (defaults to 'active' status)
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Filter by 'active' status
  const activeResult = await api.functional.erpHrm.member.projects.index(
    memberConnection,
    {
      body: {
        status: "active",
      } satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(activeResult);
  // Verify all returned projects have status 'active'
  TestValidator.predicate(
    "all projects have active status",
    activeResult.data.every((p) => p.status === "active"),
  );
  // Verify our newly created project is in the active results
  TestValidator.predicate(
    "newly created project is in active results",
    activeResult.data.some((p) => p.id === project.id),
  );
  // 4. Filter by 'archived' status
  const archivedResult = await api.functional.erpHrm.member.projects.index(
    memberConnection,
    {
      body: {
        status: "archived",
      } satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(archivedResult);
  // Verify all returned projects have status 'archived'
  TestValidator.predicate(
    "all projects have archived status",
    archivedResult.data.every((p) => p.status === "archived"),
  );
  // Verify our active project is NOT in archived results
  TestValidator.predicate(
    "active project not in archived results",
    !archivedResult.data.some((p) => p.id === project.id),
  );
}
