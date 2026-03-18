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

export async function test_api_project_complete_archived_project_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Create organization (required for project creation)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(organization);
  // 3. Create an active project (default status is active)
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(project);
  TestValidator.predicate(
    "project created with active status",
    project.status === "active",
  );
  // 4. Archive the project to set up conflict scenario
  const archivedProject = await api.functional.erpHrm.member.projects.archive(
    memberConnection,
    {
      projectId: project.id,
      body: {},
    },
  );
  typia.assert(archivedProject);
  TestValidator.equals(
    "project status is archived",
    archivedProject.status,
    "archived",
  );
  // 5. Attempt to complete archived project - should fail with 409 Conflict
  await TestValidator.httpError(
    "complete archived project returns 409 conflict",
    409,
    async () => {
      await api.functional.erpHrm.member.projects.complete(memberConnection, {
        projectId: project.id,
      });
    },
  );
  // 6. Validate project status remains archived after failed completion attempt
  // Re-fetch the project to verify state hasn't changed
  const retrievedProject = await api.functional.erpHrm.member.projects.archive(
    memberConnection,
    {
      projectId: project.id,
      body: {},
    },
  );
  typia.assert(retrievedProject);
  TestValidator.equals(
    "project status remains archived after failed complete",
    retrievedProject.status,
    "archived",
  );
}
