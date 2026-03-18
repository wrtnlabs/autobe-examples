import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

/**
 * Test basic project search functionality without filters.
 *
 * 1. Member joins and authenticates
 * 2. Creates an organization as context
 * 3. Creates 3 projects with different statuses (active, archived, completed)
 * 4. Searches without filters to retrieve all projects
 * 5. Validates pagination metadata and data integrity
 * 6. Confirms all projects regardless of status are returned
 */
export async function test_api_project_search_without_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      firstName: RandomGenerator.name(),
      lastName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      avatarUrl: null,
      timezone: null,
      locale: null,
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create three projects with different statuses
  const activeProject = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        status: "active",
      } satisfies Partial<IErpHrmProject.ICreate>,
    },
  );
  typia.assert(activeProject);
  const archivedProject = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        status: "archived",
      } satisfies Partial<IErpHrmProject.ICreate>,
    },
  );
  typia.assert(archivedProject);
  const completedProject = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        status: "completed",
      } satisfies Partial<IErpHrmProject.ICreate>,
    },
  );
  typia.assert(completedProject);
  // 4. Search without filters
  const searchResult = await api.functional.erpHrm.member.projects.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(searchResult);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records count",
    searchResult.pagination.records,
    3,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has valid pages",
    searchResult.pagination.pages >= 1,
  );
  // 6. Validate all created projects are in results
  const resultIds = searchResult.data.map((p) => p.id);
  TestValidator.predicate(
    "results contain active project",
    resultIds.includes(activeProject.id),
  );
  TestValidator.predicate(
    "results contain archived project",
    resultIds.includes(archivedProject.id),
  );
  TestValidator.predicate(
    "results contain completed project",
    resultIds.includes(completedProject.id),
  );
  // 7. Validate data integrity - all 3 projects should be present
  TestValidator.equals("total projects returned", searchResult.data.length, 3);
}
