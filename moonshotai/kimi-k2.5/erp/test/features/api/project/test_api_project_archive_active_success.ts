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
 * Test archiving an active project successfully.
 *
 * Validates the core workflow where a manager archives a temporarily inactive
 * project to prevent new timelogs while preserving historical data. Verifies
 * that the project status transitions from 'active' to 'archived', the
 * updated_at timestamp is refreshed, and the complete project entity with
 * organization relation is returned.
 */
export async function test_api_project_archive_active_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member to establish authorized session
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create organization to provide project ownership context
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create active project (default status is 'active')
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project);
  // Capture initial state for comparison
  const initialUpdatedAt = project.updated_at;
  TestValidator.equals("initial status is active", project.status, "active");
  // 4. Archive the active project
  const archivedProject = await api.functional.erpHrm.member.projects.archive(
    memberConnection,
    {
      projectId: project.id,
      body: {} satisfies IErpHrmProject.IUpdate,
    },
  );
  typia.assert(archivedProject);
  // 5. Validate archive transition and response integrity
  TestValidator.equals(
    "status changed to archived",
    archivedProject.status,
    "archived",
  );
  TestValidator.equals(
    "organization relation preserved",
    archivedProject.organization.id,
    organization.id,
  );
  TestValidator.notEquals(
    "updated_at timestamp refreshed",
    archivedProject.updated_at,
    initialUpdatedAt,
  );
}
