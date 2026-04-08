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

export async function test_api_project_update_duplicate_name_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create organization
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  typia.assert(organization);
  // 3. Create first project with name 'Alpha Project'
  const alphaProject = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: "Alpha Project",
        color: "#FF5733",
      },
    },
  );
  typia.assert(alphaProject);
  // 4. Create second project with name 'Beta Project'
  const betaProject = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: "Beta Project",
        color: "#4A90E2",
      },
    },
  );
  typia.assert(betaProject);
  // 5. Attempt to update second project with duplicate name 'Alpha Project'
  // This should fail with HTTP 400 due to duplicate name within the same organization
  await TestValidator.error(
    "duplicate project name within organization",
    async () => {
      await api.functional.erpHrm.admin.projects.update(adminConnection, {
        projectId: betaProject.items[0].projectId,
        body: {
          name: "Alpha Project",
        },
      });
    },
  );
}
