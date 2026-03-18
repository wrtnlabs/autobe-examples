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
 * Test that attempting to reactivate a completed project fails with INVALID_STATUS_TRANSITION error.
 *
 * Setup sequence:
 * 1. Authenticate as member via POST /erpHrm/auth/member/join
 * 2. Create organization via POST /erpHrm/member/organizations
 * 3. Create project via POST /erpHrm/member/projects with active status
 * 4. Complete the project via PATCH /erpHrm/member/projects/{projectId}/complete
 * 5. Attempt to reactivate the completed project via PATCH /erpHrm/member/projects/{projectId}
 *
 * Expected result:
 * - Reactivation attempt should fail with INVALID_STATUS_TRANSITION error
 * - Completed projects cannot be reactivated directly, must use 'reopen' instead
 */
export async function test_api_project_reactivate_completed_fails(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create project with active status
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        status: "active",
      },
    },
  );
  typia.assert(project);
  // Verify initial status is active
  TestValidator.equals(
    "initial project status is active",
    project.status,
    "active",
  );
  // 4. Complete the project
  const completedProject = await api.functional.erpHrm.member.projects.complete(
    memberConnection,
    {
      projectId: project.id,
    },
  );
  typia.assert(completedProject);
  // Verify project status changed to completed
  TestValidator.equals(
    "project status is completed after completion",
    completedProject.status,
    "completed",
  );
  // 5. Attempt to reactivate completed project - should throw INVALID_STATUS_TRANSITION error
  await TestValidator.error(
    "completed project reactivation fails with INVALID_STATUS_TRANSITION",
    async () => {
      await api.functional.erpHrm.member.projects.reactivate(memberConnection, {
        projectId: project.id,
      });
    },
  );
}
