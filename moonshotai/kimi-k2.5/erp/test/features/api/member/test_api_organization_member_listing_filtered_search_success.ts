import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmOrganizationMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_organization_member_listing_filtered_search_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: "Asia/Seoul",
      locale: "en-US",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(authorizedMember);
  // Step 2: Create organization to establish organization context
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_year_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // Step 3: Test member listing with no filters (baseline)
  const baselineResponse = await api.functional.erpHrm.member.members.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmOrganizationMember.IRequest,
    },
  );
  typia.assert(baselineResponse);
  TestValidator.predicate(
    "baseline has pagination",
    baselineResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "baseline has data array",
    Array.isArray(baselineResponse.data),
  );
  // Step 4: Test with isActive filter (true)
  const activeFilterResponse = await api.functional.erpHrm.member.members.index(
    memberConnection,
    {
      body: {
        isActive: true,
      } satisfies IErpHrmOrganizationMember.IRequest,
    },
  );
  typia.assert(activeFilterResponse);
  TestValidator.predicate(
    "all returned members are active",
    activeFilterResponse.data.every((member) => member.is_active === true),
  );
  // Step 5: Test with isActive filter (false)
  const inactiveFilterResponse =
    await api.functional.erpHrm.member.members.index(memberConnection, {
      body: {
        isActive: false,
      } satisfies IErpHrmOrganizationMember.IRequest,
    });
  typia.assert(inactiveFilterResponse);
  TestValidator.predicate(
    "all returned members are inactive",
    inactiveFilterResponse.data.every((member) => member.is_active === false),
  );
  // Step 6: Test with employmentType filter (single value)
  const employmentTypeResponse =
    await api.functional.erpHrm.member.members.index(memberConnection, {
      body: {
        employmentType: "full_time",
      } satisfies IErpHrmOrganizationMember.IRequest,
    });
  typia.assert(employmentTypeResponse);
  TestValidator.predicate(
    "all returned members have full_time employment type",
    employmentTypeResponse.data.every(
      (member) => member.employment_type === "full_time",
    ),
  );
  // Step 7: Test with employmentType filter (array of values)
  const employmentTypesResponse =
    await api.functional.erpHrm.member.members.index(memberConnection, {
      body: {
        employmentType: ["full_time", "part_time"],
      } satisfies IErpHrmOrganizationMember.IRequest,
    });
  typia.assert(employmentTypesResponse);
  TestValidator.predicate(
    "all returned members have valid employment types from filter",
    employmentTypesResponse.data.every(
      (member) =>
        member.employment_type === "full_time" ||
        member.employment_type === "part_time",
    ),
  );
  // Step 8: Test with departmentIds filter including 'unassigned' sentinel
  const unassignedDeptResponse =
    await api.functional.erpHrm.member.members.index(memberConnection, {
      body: {
        departmentIds: ["unassigned"],
      } satisfies IErpHrmOrganizationMember.IRequest,
    });
  typia.assert(unassignedDeptResponse);
  TestValidator.predicate(
    "all returned members have no department (unassigned)",
    unassignedDeptResponse.data.every((member) => member.department === null),
  );
  // Step 9: Test with text search filter
  const searchResponse = await api.functional.erpHrm.member.members.index(
    memberConnection,
    {
      body: {
        search: authorizedMember.firstName,
      } satisfies IErpHrmOrganizationMember.IRequest,
    },
  );
  typia.assert(searchResponse);
  // Step 10: Test with pagination parameters (limit and page)
  const paginatedResponse = await api.functional.erpHrm.member.members.index(
    memberConnection,
    {
      body: {
        limit: 10,
        page: 1,
      } satisfies IErpHrmOrganizationMember.IRequest,
    },
  );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination limit matches request",
    paginatedResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination current page matches request",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    paginatedResponse.data.length <= paginatedResponse.pagination.limit,
  );
  // Step 11: Test combined filters (isActive + employmentType)
  const combinedFilterResponse =
    await api.functional.erpHrm.member.members.index(memberConnection, {
      body: {
        isActive: true,
        employmentType: "full_time",
      } satisfies IErpHrmOrganizationMember.IRequest,
    });
  typia.assert(combinedFilterResponse);
  TestValidator.predicate(
    "combined filter results are active and full_time",
    combinedFilterResponse.data.every(
      (member) =>
        member.is_active === true && member.employment_type === "full_time",
    ),
  );
  // Step 12: Validate pagination metadata consistency
  TestValidator.predicate(
    "total records is non-negative",
    baselineResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is calculated correctly",
    baselineResponse.pagination.pages ===
      Math.ceil(
        baselineResponse.pagination.records / baselineResponse.pagination.limit,
      ),
  );
}
