import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_organizations_departments_create } from "../../../generate/generate_random_hrm_platform_member_organizations_departments_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test department list search and filter functionality.
 *
 * Validates the complete department listing workflow including member authentication, organization setup, department creation with various names and descriptions, and comprehensive filter testing. Ensures that search, name, description, and parentDepartmentId filters return correct subsets of departments.
 *
 * Special attention is given to verifying hierarchical department relationships through parent-child testing, partial text matching in name and description filters, and pagination behavior when results exceed page limits.
 *
 * 1. Member registers with email and credentials.
 * 2. Member creates an organization.
 * 3. Creates multiple top-level departments: Engineering, Marketing, Sales, Customer Support.
 * 4. Creates parent department (Operations) and child departments under it.
 * 5. Tests name filter by searching for partial department name matches.
 * 6. Tests description filter by searching for keywords in department descriptions.
 * 7. Tests parentDepartmentId filter by retrieving only child departments under a specific parent.
 * 8. Tests general search field that searches across both name and description.
 * 9. Verifies each filter returns the correct subset of departments.
 * 10. Verifies pagination works correctly when results exceed page limit.
 */
export async function test_api_department_list_search_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create multiple top-level departments with distinct names and descriptions
  const engineeringDept =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: "Engineering",
          description:
            "Software development and technical operations department",
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(engineeringDept);
  const marketingDept =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: "Marketing",
          description: "Brand management and promotional activities department",
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(marketingDept);
  const salesDept =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: "Sales",
          description: "Customer acquisition and revenue generation department",
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(salesDept);
  const customerSupportDept =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: "Customer Support",
          description: "Customer service and technical support department",
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(customerSupportDept);
  // 4. Create parent department and child departments for hierarchy testing
  const operationsParent =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: "Operations",
          description: "Main operations department managing business processes",
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(operationsParent);
  const logisticsChild =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: "Logistics",
          description: "Supply chain and logistics management under operations",
          parentDepartmentId: operationsParent.id,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(logisticsChild);
  const qualityChild =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: "Quality Assurance",
          description: "Quality control and testing under operations",
          parentDepartmentId: operationsParent.id,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(qualityChild);
  // 5. Test name filter - search for departments with "ing" in name
  const nameFilterResult =
    await api.functional.hrmPlatform.member.organizations.departments.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          name: "ing",
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(nameFilterResult);
  TestValidator.predicate(
    "name filter returns Engineering and Marketing",
    () =>
      nameFilterResult.data.length >= 2 &&
      nameFilterResult.data.some((d) => d.name === "Engineering") &&
      nameFilterResult.data.some((d) => d.name === "Marketing"),
  );
  // 6. Test description filter - search for "customer" keyword
  const descriptionFilterResult =
    await api.functional.hrmPlatform.member.organizations.departments.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          description: "customer",
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(descriptionFilterResult);
  TestValidator.predicate(
    "description filter returns Customer Support",
    () =>
      descriptionFilterResult.data.length >= 1 &&
      descriptionFilterResult.data.some((d) => d.name === "Customer Support"),
  );
  // 7. Test parentDepartmentId filter - get child departments under Operations
  const parentFilterResult =
    await api.functional.hrmPlatform.member.organizations.departments.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          parentDepartmentId: operationsParent.id,
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(parentFilterResult);
  TestValidator.equals(
    "parent filter returns exactly 2 child departments",
    parentFilterResult.data.length,
    2,
  );
  TestValidator.predicate(
    "child departments are Logistics and Quality Assurance",
    () =>
      parentFilterResult.data.some((d) => d.name === "Logistics") &&
      parentFilterResult.data.some((d) => d.name === "Quality Assurance"),
  );
  TestValidator.predicate(
    "child departments have correct parent reference",
    () =>
      parentFilterResult.data.every(
        (d) =>
          d.parentDepartment !== null &&
          d.parentDepartment.id === operationsParent.id,
      ),
  );
  // 8. Test general search field - search across name and description
  const searchResult =
    await api.functional.hrmPlatform.member.organizations.departments.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          search: "operations",
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search finds Operations and related departments",
    () =>
      searchResult.data.length >= 1 &&
      searchResult.data.some((d) => d.name === "Operations"),
  );
  // 9. Test pagination with limit
  const paginatedResult =
    await api.functional.hrmPlatform.member.organizations.departments.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          page: 1,
          limit: 3,
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination limit respected",
    () => paginatedResult.data.length <= 3,
  );
  TestValidator.equals(
    "pagination current page is 1",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 3",
    paginatedResult.pagination.limit,
    3,
  );
  TestValidator.predicate(
    "pagination total records matches created departments",
    () => paginatedResult.pagination.records >= 7,
  );
  // 10. Test second page of pagination
  const page2Result =
    await api.functional.hrmPlatform.member.organizations.departments.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          page: 2,
          limit: 3,
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "pagination current page is 2",
    page2Result.pagination.current,
    2,
  );
  TestValidator.predicate(
    "page 2 has different departments than page 1",
    () => {
      const page1Ids = paginatedResult.data.map((d) => d.id);
      const page2Ids = page2Result.data.map((d) => d.id);
      return page1Ids.every((id) => !page2Ids.includes(id));
    },
  );
}
