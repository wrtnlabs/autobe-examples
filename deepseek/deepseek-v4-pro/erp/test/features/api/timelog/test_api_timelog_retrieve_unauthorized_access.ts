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
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
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

/**
 * Test that a member without permissions cannot access another member's timelog.
 *
 * Validates access control enforcement on timelog retrieval. A timelog created by Member A must not be accessible to Member B, who lacks the view-all-time permission. This ensures data privacy and organizational boundaries by restricting timelog visibility to the owning employee and users with elevated time management permissions.
 *
 * 1. Member A registers and creates an active project.
 * 2. Member A is assigned to the project.
 * 3. Member A creates a timelog entry against the project.
 * 4. Member B registers as a separate member with no special permissions.
 * 5. Member B attempts to retrieve Member A's timelog by its ID.
 * 6. The system returns 403 Forbidden, confirming unauthorized access is blocked.
 */
export async function test_api_timelog_retrieve_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member A creates an active project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberAConnection,
    {},
  );
  typia.assert(project);
  // 3. Assign Member A to the project
  await generate_random_erp_hrm_member_projects_members_create(
    memberAConnection,
    {
      params: { projectId: project.id },
    },
  );
  // 4. Member A creates a timelog
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberAConnection,
    {
      body: {
        project_id: project.id,
      },
    },
  );
  typia.assert(timelog);
  // 5. Authenticate as Member B (different member, no special permissions)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 6. Member B attempts to retrieve Member A's timelog → expect 403
  await TestValidator.httpError(
    "Member B cannot access Member A's timelog without view-all-time permission",
    403,
    async () => {
      await api.functional.erpHrm.member.timelogs.at(memberBConnection, {
        timelogId: timelog.id,
      });
    },
  );
}
