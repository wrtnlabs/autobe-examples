import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

/**
 * Test the business rule validation that prevents archiving a completed project.
 * This validates state transition restrictions between different terminal/inactive states.
 */
export async function test_api_project_archive_completed_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a new organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a new project with active status
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  TestValidator.equals(
    "project initial status is active",
    project.status,
    "active",
  );
  // 4. Update the project status to 'completed'
  const completedProject = await api.functional.erpHrm.member.projects.update(
    memberConnection,
    {
      projectId: project.id,
      body: { status: "completed" } satisfies IErpHrmProject.IUpdate,
    },
  );
  typia.assert(completedProject);
  TestValidator.equals(
    "project status is completed after update",
    completedProject.status,
    "completed",
  );
  // 5. Attempt to archive the completed project - should fail with 409 Conflict
  await TestValidator.httpError(
    "should throw 409 Conflict when archiving completed project",
    409,
    async () => {
      await api.functional.erpHrm.member.projects.archive(memberConnection, {
        projectId: project.id,
        body: {} satisfies IErpHrmProject.IUpdate,
      });
    },
  );
}
