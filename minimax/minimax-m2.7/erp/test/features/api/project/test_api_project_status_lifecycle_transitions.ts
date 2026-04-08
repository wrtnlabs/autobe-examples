import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

/**
 * Test project status lifecycle transitions following valid and invalid transition paths.
 *
 * Valid transitions:
 * - active → archived (200 OK)
 * - active → completed (200 OK)
 * - archived → active (200 OK)
 * - archived → completed (200 OK)
 * - completed → archived (200 OK)
 *
 * Invalid transitions:
 * - completed → active (400 Bad Request)
 *
 * @param connection Base API connection
 */
export async function test_api_project_status_lifecycle_transitions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_admin_organizations_create(adminConnection, {});
  typia.assert(organization);
  // 3. Create project with 'active' status
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733",
        status: "active",
      },
    },
  );

  // Extended project type with id and status for API responses
  type ProjectResponse = IErpHrmProject & { id: string; status: string };
  const validatedProject = typia.assert<ProjectResponse>(project);

  // 4. Valid transition: active → archived
  const archivedProject = typia.assert<ProjectResponse>(
    await api.functional.erpHrm.admin.projects.update(adminConnection, {
      projectId: validatedProject.id,
      body: {
        status: "archived",
      },
    }),
  );
  TestValidator.equals(
    "status is archived",
    archivedProject.status,
    "archived",
  );
  // 5. Valid transition: archived → completed
  const completedProject = typia.assert<ProjectResponse>(
    await api.functional.erpHrm.admin.projects.update(adminConnection, {
      projectId: archivedProject.id,
      body: {
        status: "completed",
      },
    }),
  );
  TestValidator.equals(
    "status is completed",
    completedProject.status,
    "completed",
  );
  // 6. Invalid transition: completed → active (should fail with 400)
  await TestValidator.httpError(
    "completed cannot transition to active",
    400,
    async () => {
      await api.functional.erpHrm.admin.projects.update(adminConnection, {
        projectId: completedProject.id,
        body: {
          status: "active",
        },
      });
    },
  );
}