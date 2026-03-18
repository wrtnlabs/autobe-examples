import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_departments_create } from "../../../generate/generate_random_erp_hrm_member_organizations_departments_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_department_list_filtered_by_keyword_and_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create top-level department "Engineering"
  const engineeringDept =
    await generate_random_erp_hrm_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: "Engineering",
          parentId: null,
        },
        params: { organizationId: organization.id },
      },
    );
  typia.assert(engineeringDept);
  // 4. Create child department "Frontend Engineering" under "Engineering"
  const frontendDept =
    await generate_random_erp_hrm_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: "Frontend Engineering",
          parentId: engineeringDept.id,
        },
        params: { organizationId: organization.id },
      },
    );
  typia.assert(frontendDept);
  // 5. Create child department "Backend Engineering" under "Engineering"
  const backendDept =
    await generate_random_erp_hrm_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: "Backend Engineering",
          parentId: engineeringDept.id,
        },
        params: { organizationId: organization.id },
      },
    );
  typia.assert(backendDept);
  // 6. Create top-level department "Product Management"
  const productMgmtDept =
    await generate_random_erp_hrm_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: "Product Management",
          parentId: null,
        },
        params: { organizationId: organization.id },
      },
    );
  typia.assert(productMgmtDept);
  // --- Test Case A: keyword filter "Engineering" ---
  const keywordResult =
    await api.functional.erpHrm.member.organizations.departments.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: { keyword: "Engineering" } satisfies IErpHrmDepartment.IRequest,
      },
    );
  typia.assert(keywordResult);
  // Should contain Engineering, Frontend Engineering, Backend Engineering
  const keywordNames = keywordResult.data.map((d) => d.name);
  TestValidator.predicate(
    "keyword filter includes Engineering",
    keywordNames.includes("Engineering"),
  );
  TestValidator.predicate(
    "keyword filter includes Frontend Engineering",
    keywordNames.includes("Frontend Engineering"),
  );
  TestValidator.predicate(
    "keyword filter includes Backend Engineering",
    keywordNames.includes("Backend Engineering"),
  );
  TestValidator.predicate(
    "keyword filter excludes Product Management",
    !keywordNames.includes("Product Management"),
  );
  TestValidator.equals("keyword filter count", keywordResult.data.length, 3);
  // --- Test Case B: top-level filter (parentId: null) ---
  const topLevelResult =
    await api.functional.erpHrm.member.organizations.departments.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: { parentId: null } satisfies IErpHrmDepartment.IRequest,
      },
    );
  typia.assert(topLevelResult);
  const topLevelNames = topLevelResult.data.map((d) => d.name);
  TestValidator.predicate(
    "top-level filter includes Engineering",
    topLevelNames.includes("Engineering"),
  );
  TestValidator.predicate(
    "top-level filter includes Product Management",
    topLevelNames.includes("Product Management"),
  );
  TestValidator.predicate(
    "top-level filter excludes Frontend Engineering",
    !topLevelNames.includes("Frontend Engineering"),
  );
  TestValidator.predicate(
    "top-level filter excludes Backend Engineering",
    !topLevelNames.includes("Backend Engineering"),
  );
  TestValidator.equals("top-level filter count", topLevelResult.data.length, 2);
  // --- Test Case C: children filter (parentId: engineeringDept.id) ---
  const childrenResult =
    await api.functional.erpHrm.member.organizations.departments.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          parentId: engineeringDept.id,
        } satisfies IErpHrmDepartment.IRequest,
      },
    );
  typia.assert(childrenResult);
  const childrenNames = childrenResult.data.map((d) => d.name);
  TestValidator.predicate(
    "children filter includes Frontend Engineering",
    childrenNames.includes("Frontend Engineering"),
  );
  TestValidator.predicate(
    "children filter includes Backend Engineering",
    childrenNames.includes("Backend Engineering"),
  );
  TestValidator.predicate(
    "children filter excludes Engineering",
    !childrenNames.includes("Engineering"),
  );
  TestValidator.predicate(
    "children filter excludes Product Management",
    !childrenNames.includes("Product Management"),
  );
  TestValidator.equals("children filter count", childrenResult.data.length, 2);
  // --- Test Case D: sort by name ---
  const sortedResult =
    await api.functional.erpHrm.member.organizations.departments.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: { sortBy: "name" } satisfies IErpHrmDepartment.IRequest,
      },
    );
  typia.assert(sortedResult);
  // Verify sorted alphabetically
  const sortedNames = sortedResult.data.map((d) => d.name);
  const expectedSorted = [...sortedNames].sort((a, b) => a.localeCompare(b));
  TestValidator.equals("sort by name ascending", sortedNames, expectedSorted);
  // --- Test Case E: pagination ---
  const page1Result =
    await api.functional.erpHrm.member.organizations.departments.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: { page: 1, limit: 2 } satisfies IErpHrmDepartment.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 2);
  TestValidator.equals("page 1 data length", page1Result.data.length, 2);
  TestValidator.equals("total records", page1Result.pagination.records, 4);
  TestValidator.equals("total pages", page1Result.pagination.pages, 2);
  TestValidator.equals("current page", page1Result.pagination.current, 1);
  const page2Result =
    await api.functional.erpHrm.member.organizations.departments.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: { page: 2, limit: 2 } satisfies IErpHrmDepartment.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 2);
  TestValidator.equals("page 2 data length", page2Result.data.length, 2);
  TestValidator.equals(
    "page 2 total records",
    page2Result.pagination.records,
    4,
  );
  TestValidator.equals(
    "page 2 current page",
    page2Result.pagination.current,
    2,
  );
  // Ensure no overlap between pages
  const page1Ids = page1Result.data.map((d) => d.id);
  const page2Ids = page2Result.data.map((d) => d.id);
  const overlap = page1Ids.filter((id) => page2Ids.includes(id));
  TestValidator.equals("no overlap between pages", overlap.length, 0);
}
