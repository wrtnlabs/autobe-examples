import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProject";
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

/**
 * Test fuzzy text search on project names using trigram matching.
 *
 * Validates that the project list endpoint supports partial name search via
 * PostgreSQL trigram similarity. Creates a project with a distinctive name,
 * searches with a partial term to confirm fuzzy matching returns the correct
 * project, and verifies that non-matching search terms yield an empty result
 * set with correct pagination metadata (records=0, pages=0).
 *
 * 1. Authenticate as a member to establish session and organization context.
 * 2. Create a project with the distinctive name "Marketing Campaign 2026".
 * 3. Search with partial term "market" and verify the project is included.
 * 4. Search with a term matching no projects and verify empty result set.
 */
export async function test_api_project_list_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a project with a distinctive name
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Marketing Campaign 2026",
      },
    },
  );
  typia.assert(project);
  // 3. Search with a partial term that should match via trigram
  const searchResult = await api.functional.erpHrm.member.projects.index(
    memberConnection,
    {
      body: {
        search: "market",
      } satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search result includes the matching project",
    searchResult.data.some((p) => p.id === project.id),
  );
  // 4. Search with a term matching no projects
  const emptyResult = await api.functional.erpHrm.member.projects.index(
    memberConnection,
    {
      body: {
        search: "xyznonexistent12345",
      } satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("empty result pages", emptyResult.pagination.pages, 0);
}
