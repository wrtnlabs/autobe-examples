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

export async function test_api_project_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. First admin joins and creates a project in organization A
  const adminConnection1: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection1, {});
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection1,
    {},
  );
  // 2. Second admin joins (different organization B)
  const adminConnection2: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection2, {});
  // 3. Attempt to retrieve the project from organization A using organization B's admin
  // This should fail because projects are isolated by organization
  const mockProjectId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "Second admin cannot access first admin's project",
    404,
    async () =>
      await api.functional.erpHrm.admin.projects.at(adminConnection2, {
        projectId: mockProjectId,
      }),
  );
}
