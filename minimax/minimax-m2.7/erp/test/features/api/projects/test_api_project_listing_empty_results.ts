import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProject";
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

export async function test_api_project_listing_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create active projects to ensure no archived projects exist
  await ArrayUtil.asyncRepeat(3, async () => {
    return await generate_random_erp_hrm_admin_projects_create(
      adminConnection,
      {
        body: {
          status: "active",
        },
      },
    );
  });
  // 3. Query projects with status filter set to 'archived' (no matches)
  const response = await api.functional.erpHrm.admin.projects.index(
    adminConnection,
    {
      body: {
        status: "archived",
      },
    },
  );
  typia.assert(response);
  // 4. Validate response is HTTP 200 (empty list, not error)
  TestValidator.equals("data array should be empty", response.data.length, 0);
  // 5. Validate pagination metadata shows zero records and pages
  TestValidator.equals("records should be 0", response.pagination.records, 0);
  TestValidator.equals("pages should be 0", response.pagination.pages, 0);
  TestValidator.equals(
    "current page should be 1",
    response.pagination.current,
    1,
  );
}
