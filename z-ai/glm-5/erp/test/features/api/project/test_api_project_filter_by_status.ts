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

export async function test_api_project_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create multiple active projects
  const activeProjects: IErpHrmProject[] = await ArrayUtil.asyncRepeat(2, () =>
    generate_random_erp_hrm_member_projects_create(memberConnection, {}),
  );
  // 3. Filter by 'active' status - validate only active projects returned
  const activeResult = await api.functional.erpHrm.member.projects.index(
    memberConnection,
    {
      body: { status: "active" } satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(activeResult);
  // Validate all returned projects have 'active' status
  TestValidator.predicate(
    "all filtered projects should have active status",
    activeResult.data.every((project) => project.status === "active"),
  );
  // Validate all created active projects are in the filtered results
  const activeProjectIds = activeProjects.map((p) => p.id);
  const filteredActiveIds = activeResult.data.map((p) => p.id);
  TestValidator.predicate(
    "all created active projects should be in filtered results",
    activeProjectIds.every((id) => filteredActiveIds.includes(id)),
  );
  // 4. Filter with no status - validate all projects are returned
  const allResult = await api.functional.erpHrm.member.projects.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(allResult);
  // Validate all created projects are in unfiltered results
  const allResultIds = allResult.data.map((p) => p.id);
  TestValidator.predicate(
    "all created projects should be in unfiltered results",
    activeProjectIds.every((id) => allResultIds.includes(id)),
  );
  // Validate unfiltered results contain at least as many projects as filtered
  TestValidator.predicate(
    "unfiltered results should contain at least as many projects as active filtered",
    allResult.data.length >= activeResult.data.length,
  );
}
