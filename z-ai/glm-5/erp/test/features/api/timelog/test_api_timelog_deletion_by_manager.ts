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

/**
 * Test that managers with 'time:manage' permission can delete timelogs.
 *
 * Scenario: A manager (owner role has time:manage permission) needs to delete
 * a timelog for data correction purposes. The manager has administrative override
 * capability to delete timelogs even if they are part of a submitted timesheet.
 *
 * Steps:
 * 1. Authenticate as a manager member (owner role has time:manage permission)
 * 2. Create a project within the organization
 * 3. Create a timelog for the project
 * 4. Delete the timelog using manager credentials
 *
 * Expected Result: The manager successfully deletes the timelog.
 * The deletion is performed as a soft delete (deleted_at timestamp is set).
 */
export async function test_api_timelog_deletion_by_manager(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as manager (owner role has time:manage permission)
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(manager);
  // Step 2: Create a project within the organization
  const project = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // Step 3: Create a timelog for the project
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    managerConnection,
    {
      body: {
        project_id: project.id,
        date: new Date().toISOString(),
        duration: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      },
    },
  );
  typia.assert(timelog);
  // Step 4: Delete the timelog as manager (has time:manage permission)
  await api.functional.erpHrm.member.timelogs.erase(managerConnection, {
    timelogId: timelog.id,
  });
}
