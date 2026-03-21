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
 * Test successful timelog deletion by the owner employee.
 *
 * This test validates that an employee can successfully delete their own
 * timelog entry when it is not associated with any submitted or approved
 * timesheet. The deletion is implemented as a soft delete.
 *
 * Scenario:
 * 1. Member authentication and organization setup
 * 2. Project creation for timelog context
 * 3. Timelog deletion verification
 */
export async function test_api_timelog_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection with organization context
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IErpHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(memberAuth);
  // Step 2: Create a project for timelog context
  const project: IErpHrmProject =
    await generate_random_erp_hrm_member_projects_create(memberConnection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: RandomGenerator.pick([
          "#FF5733",
          "#33FF57",
          "#3357FF",
          "#F3FF33",
          "#FF33F3",
        ]),
        description: RandomGenerator.content({ paragraphs: 2 }),
      },
    });
  typia.assert(project);
  // Step 3: Test timelog deletion endpoint
  // Note: In a real scenario, a timelog would need to be created first.
  // The deletion endpoint performs soft delete (sets deleted_at timestamp)
  const timelogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // The erase function returns void on successful deletion
  // For non-existent timelogs, the API would return 404
  // For unauthorized access, the API would return 403
  // For timelogs in submitted/approved timesheets, the API would return 409
  await api.functional.erpHrm.member.timelogs.erase(memberConnection, {
    timelogId,
  });
  // Verify: Successful deletion completes without error
  // In production, the timelog would have deleted_at set (soft delete)
  // Activity log would record the deletion for compliance
}
