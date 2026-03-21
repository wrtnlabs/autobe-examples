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
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_project_creation_different_statuses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create project with 'archived' status
  const archivedProject = await api.functional.erpHrm.member.projects.create(
    memberConnection,
    {
      body: {
        name: `Archived Project ${RandomGenerator.alphaNumeric(8)}`,
        color: "#FF5733" as string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
        status: "archived",
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  typia.assert(archivedProject);
  TestValidator.equals(
    "archived project status",
    archivedProject.status,
    "archived",
  );
  // 3. Create project with 'completed' status
  const completedProject = await api.functional.erpHrm.member.projects.create(
    memberConnection,
    {
      body: {
        name: `Completed Project ${RandomGenerator.alphaNumeric(8)}`,
        color: "#33FF57" as string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
        status: "completed",
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  typia.assert(completedProject);
  TestValidator.equals(
    "completed project status",
    completedProject.status,
    "completed",
  );
}
