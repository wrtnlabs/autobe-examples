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

export async function test_api_project_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member with project management permission
  // The join operation creates the member account and first organization
  // where the member becomes the owner with full permissions including project:manage
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create a project to be deleted
  // Generate a hex color code for UI display (pattern: #RRGGBB)
  const colorCode = typia.random<string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">>();
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: colorCode,
        budget_hours: typia.random<number & tags.Minimum<0>>(),
      },
    },
  );
  typia.assert(project);
  // 3. Delete the project (happy path - no timelogs associated)
  // This should succeed because:
  // - User has project:manage permission (as organization owner)
  // - Project exists and is not deleted
  // - No timelogs are associated with this project
  await api.functional.erpHrm.member.projects.erase(memberConnection, {
    projectId: project.id,
  });
  // 4. Verify deletion by attempting to delete again should fail
  // The project should no longer exist (404 expected)
  await TestValidator.error(
    "project should not exist after deletion",
    async () => {
      await api.functional.erpHrm.member.projects.erase(memberConnection, {
        projectId: project.id,
      });
    },
  );
}
