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
 * Test business rule validation that prevents archiving an already archived project.
 * Validates state machine integrity: attempting to archive a project that is already
 * archived must return HTTP 409 Conflict.
 */
export async function test_api_project_archive_already_archived_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: {} });
  // 2. Create organization context
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create project with active status (default)
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  TestValidator.equals("initial project status", project.status, "active");
  // 4. Update project status to archived via PUT
  const archivedProject = await api.functional.erpHrm.member.projects.update(
    memberConnection,
    {
      projectId: project.id,
      body: { status: "archived" } satisfies IErpHrmProject.IUpdate,
    },
  );
  typia.assert(archivedProject);
  TestValidator.equals(
    "project status after PUT update",
    archivedProject.status,
    "archived",
  );
  // 5. Attempt to archive already archived project - should fail with 409 Conflict
  await TestValidator.httpError(
    "should reject archive request for already archived project with 409 Conflict",
    409,
    async () => {
      await api.functional.erpHrm.member.projects.archive(memberConnection, {
        projectId: project.id,
        body: {} satisfies IErpHrmProject.IUpdate,
      });
    },
  );
}
