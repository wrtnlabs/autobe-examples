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

export async function test_api_project_search_with_name_filter(
  connection: api.IConnection,
): Promise<void> {
  // Setup first member and organization
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  await generate_random_erp_hrm_member_organizations_create(member1Connection, {
    body: {
      name: RandomGenerator.paragraph({ sentences: 2 }),
      currency: "USD",
      timezone: "America/New_York",
      fiscal_year_start_month: 1,
    } satisfies IErpHrmOrganization.ICreate,
  });
  // Create projects with specific names for filtering test
  const projectMarketing = await generate_random_erp_hrm_member_projects_create(
    member1Connection,
    {
      body: {
        name: "Marketing Website Redesign",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(projectMarketing);
  const projectMobile = await generate_random_erp_hrm_member_projects_create(
    member1Connection,
    {
      body: { name: "Mobile App Development" } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(projectMobile);
  const projectCRM = await generate_random_erp_hrm_member_projects_create(
    member1Connection,
    {
      body: { name: "Internal CRM System" } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(projectCRM);
  // Setup second member and organization for isolation test
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  await generate_random_erp_hrm_member_organizations_create(member2Connection, {
    body: {
      name: RandomGenerator.paragraph({ sentences: 2 }),
      currency: "USD",
      timezone: "America/New_York",
      fiscal_year_start_month: 1,
    } satisfies IErpHrmOrganization.ICreate,
  });
  // Create project with matching term in second organization (should not appear in member1's search)
  const otherOrgProject = await generate_random_erp_hrm_member_projects_create(
    member2Connection,
    {
      body: {
        name: "Mobile Marketing Campaign",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(otherOrgProject);
  // Search for "Mobile" - should only return Mobile App Development from org1
  const searchResult = await api.functional.erpHrm.member.projects.index(
    member1Connection,
    {
      body: { search: "Mobile" } satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(searchResult);
  // Validate filtered results
  TestValidator.equals("filtered result count", searchResult.data.length, 1);
  TestValidator.equals(
    "pagination total records",
    searchResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "returned project name",
    searchResult.data[0].name,
    projectMobile.name,
  );
  TestValidator.predicate(
    "name contains search term (case insensitive)",
    searchResult.data[0].name.toLowerCase().includes("mobile"),
  );
  // Verify cross-organization isolation
  const hasOtherOrgProject = searchResult.data.some(
    (p) => p.id === otherOrgProject.id,
  );
  TestValidator.predicate(
    "no cross-organization projects in results",
    !hasOtherOrgProject,
  );
  // Test case-insensitive search with lowercase
  const searchResultLower = await api.functional.erpHrm.member.projects.index(
    member1Connection,
    {
      body: { search: "mobile" } satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(searchResultLower);
  TestValidator.equals(
    "case-insensitive search count",
    searchResultLower.data.length,
    1,
  );
  TestValidator.equals(
    "case-insensitive search result",
    searchResultLower.data[0].name,
    projectMobile.name,
  );
}
