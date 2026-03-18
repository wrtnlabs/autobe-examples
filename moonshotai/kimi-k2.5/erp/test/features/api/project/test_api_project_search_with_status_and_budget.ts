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

export async function test_api_project_search_with_status_and_budget(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create organization context
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(organization);
  // 3. Create projects with different statuses and budget hours
  const activeProjectInRange =
    await generate_random_erp_hrm_member_projects_create(memberConnection, {
      body: {
        name: RandomGenerator.name(3),
        status: "active",
        budgetHours: 100,
      } satisfies IErpHrmProject.ICreate,
    });
  typia.assert(activeProjectInRange);
  const archivedProjectInRange =
    await generate_random_erp_hrm_member_projects_create(memberConnection, {
      body: {
        name: RandomGenerator.name(3),
        status: "archived",
        budgetHours: 100,
      } satisfies IErpHrmProject.ICreate,
    });
  typia.assert(archivedProjectInRange);
  const completedProjectInRange =
    await generate_random_erp_hrm_member_projects_create(memberConnection, {
      body: {
        name: RandomGenerator.name(3),
        status: "completed",
        budgetHours: 100,
      } satisfies IErpHrmProject.ICreate,
    });
  typia.assert(completedProjectInRange);
  const activeProjectOutOfRange =
    await generate_random_erp_hrm_member_projects_create(memberConnection, {
      body: {
        name: RandomGenerator.name(3),
        status: "active",
        budgetHours: 10,
      } satisfies IErpHrmProject.ICreate,
    });
  typia.assert(activeProjectOutOfRange);
  // 4. Search with status and budget range filters
  const searchResult = await api.functional.erpHrm.member.projects.index(
    memberConnection,
    {
      body: {
        status: "active",
        budgetHoursFrom: 50,
        budgetHoursTo: 150,
      } satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(searchResult);
  // 5. Validate AND logic - only active project with budget in range should be returned
  TestValidator.equals("search results count", searchResult.data.length, 1);
  TestValidator.equals(
    "filtered project is active with correct budget",
    searchResult.data[0].id,
    activeProjectInRange.id,
  );
  TestValidator.equals(
    "project status is active",
    searchResult.data[0].status,
    "active",
  );
  TestValidator.equals(
    "project budget hours",
    searchResult.data[0].budgetHours,
    100,
  );
  // 6. Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("total records", searchResult.pagination.records, 1);
  TestValidator.equals("total pages", searchResult.pagination.pages, 1);
  // 7. Verify archived and completed projects do NOT appear in results
  const resultIds = searchResult.data.map((p) => p.id);
  TestValidator.predicate(
    "archived project should not be in results",
    !resultIds.includes(archivedProjectInRange.id),
  );
  TestValidator.predicate(
    "completed project should not be in results",
    !resultIds.includes(completedProjectInRange.id),
  );
  TestValidator.predicate(
    "active project with budget out of range should not be in results",
    !resultIds.includes(activeProjectOutOfRange.id),
  );
}
