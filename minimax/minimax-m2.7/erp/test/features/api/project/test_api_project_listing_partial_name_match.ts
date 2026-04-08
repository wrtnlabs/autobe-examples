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

export async function test_api_project_listing_partial_name_match(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  typia.assert(authorized);
  // 2. Create test projects with various names
  const alphaProject1 = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: "Alpha Dashboard",
        color: "#FF5733",
        status: "active",
      },
    },
  );
  typia.assert(alphaProject1);
  const betaProject = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: "Beta Dashboard",
        color: "#4A90E2",
        status: "active",
      },
    },
  );
  typia.assert(betaProject);
  const alphaProject2 = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: "alpha analytics",
        color: "#50C878",
        status: "active",
      },
    },
  );
  typia.assert(alphaProject2);
  const gammaProject = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: "Gamma Reports",
        color: "#9B59B6",
        status: "active",
      },
    },
  );
  typia.assert(gammaProject);
  // 3. Query project list with name filter 'alpha' (case-insensitive partial match)
  const searchResponse = await api.functional.erpHrm.admin.projects.index(
    adminConnection,
    {
      body: {
        name: "alpha",
        status: "active",
      } satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(searchResponse);
  // 4. Validate search results
  const matchedProjectNames = searchResponse.data.map((p) => p.name);
  // Should include 'Alpha Dashboard' and 'alpha analytics' (case-insensitive partial match)
  TestValidator.equals(
    "should include 'Alpha Dashboard'",
    matchedProjectNames.includes("Alpha Dashboard"),
    true,
  );
  TestValidator.equals(
    "should include 'alpha analytics'",
    matchedProjectNames.includes("alpha analytics"),
    true,
  );
  // Should exclude 'Beta Dashboard' and 'Gamma Reports'
  TestValidator.equals(
    "should exclude 'Beta Dashboard'",
    matchedProjectNames.includes("Beta Dashboard"),
    false,
  );
  TestValidator.equals(
    "should exclude 'Gamma Reports'",
    matchedProjectNames.includes("Gamma Reports"),
    false,
  );
  // Verify exactly 2 projects matched
  TestValidator.equals(
    "should have exactly 2 matching projects",
    searchResponse.data.length,
    2,
  );
}
