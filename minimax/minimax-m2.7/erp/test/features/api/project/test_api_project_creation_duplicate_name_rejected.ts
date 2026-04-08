import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

export async function test_api_project_creation_duplicate_name_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create first project with a specific name
  const projectName = RandomGenerator.paragraph({ sentences: 2 });
  const firstProject = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: projectName,
        color: "#FF5733",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(firstProject);
  // 3. Attempt to create second project with same name (case-sensitive) - should fail with 409
  await TestValidator.httpError(
    "duplicate project name (case-sensitive) should be rejected",
    409,
    async () =>
      await api.functional.erpHrm.admin.projects.create(adminConnection, {
        body: {
          name: projectName,
          color: "#4A90E2",
        } satisfies IErpHrmProject.ICreate,
      }),
  );
  // 4. Attempt to create third project with same name (case-insensitive) - should fail with 409
  await TestValidator.httpError(
    "duplicate project name (case-insensitive) should be rejected",
    409,
    async () =>
      await api.functional.erpHrm.admin.projects.create(adminConnection, {
        body: {
          name: projectName.toUpperCase(),
          color: "#4A90E2",
        } satisfies IErpHrmProject.ICreate,
      }),
  );
}
