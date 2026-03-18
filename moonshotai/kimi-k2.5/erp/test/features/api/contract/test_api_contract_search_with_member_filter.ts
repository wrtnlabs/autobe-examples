import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_contracts_create } from "../../../generate/generate_random_erp_hrm_member_contracts_create";
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_contract } from "../../../prepare/prepare_random_erp_hrm_contract";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";

/**
 * Test searching employment contracts with comprehensive filtering options.
 * The test sequence: (1) Join as member to authenticate, (2) Create an organization
 * to establish context, (3) Create an organization member (employee), (4) Create an
 * employment contract for the member, (5) Search contracts filtering by
 * organization_member_id to verify the contract appears in results. Validate that
 * the response includes the created contract with correct employmentType, payRate,
 * workingHoursPerWeek, isActive status, and nested organizationMember information.
 * Confirm pagination metadata is properly returned with current page, limit, records
 * count, and pages count. Verify the contract's startDate and payPeriod match the
 * created record.
 */
export async function test_api_contract_search_with_member_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create organization member
  const organizationMember =
    await generate_random_erp_hrm_member_organization_members_create(
      memberConnection,
      {
        body: {
          organizationId: organization.id,
        } satisfies Partial<IErpHrmOrganizationMember.ICreate>,
      },
    );
  typia.assert(organizationMember);
  // 4. Create employment contract for the member
  const contract = await generate_random_erp_hrm_member_contracts_create(
    memberConnection,
    {
      body: {
        organization_member_id: organizationMember.id,
      } satisfies Partial<IErpHrmContract.ICreate>,
    },
  );
  typia.assert(contract);
  // 5. Search contracts filtering by organization_member_id
  const searchResult: IPageIErpHrmContract.ISummary =
    await api.functional.erpHrm.member.contracts.index(memberConnection, {
      body: {
        organizationMemberId: organizationMember.id,
        limit: 20,
      } satisfies IErpHrmContract.IRequest,
    });
  typia.assert(searchResult);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    searchResult.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    searchResult.pagination.pages >= 1,
  );
  // 7. Validate contract appears in results
  TestValidator.predicate(
    "search result contains at least one contract",
    searchResult.data.length >= 1,
  );
  // 8. Find and validate the created contract in results
  const foundContract = searchResult.data.find((c) => c.id === contract.id);
  TestValidator.predicate(
    "created contract found in search results",
    foundContract !== undefined,
  );
  if (foundContract !== undefined) {
    // Validate contract fields match
    TestValidator.equals(
      "employment type matches",
      foundContract.employmentType,
      contract.employmentType,
    );
    TestValidator.equals(
      "pay rate matches",
      foundContract.payRate,
      contract.payRate,
    );
    TestValidator.equals(
      "working hours per week matches",
      foundContract.workingHoursPerWeek,
      contract.workingHoursPerWeek,
    );
    TestValidator.equals(
      "is active status matches",
      foundContract.isActive,
      contract.isActive,
    );
    TestValidator.equals(
      "pay period matches",
      foundContract.payPeriod,
      contract.payPeriod,
    );
    TestValidator.equals(
      "start date matches",
      foundContract.startDate,
      contract.startDate,
    );
    // Validate nested organization member information
    TestValidator.equals(
      "organization member id matches",
      foundContract.organizationMember.id,
      organizationMember.id,
    );
    TestValidator.predicate(
      "organization member has user info",
      foundContract.organizationMember.user !== undefined,
    );
    TestValidator.predicate(
      "organization member has role info",
      foundContract.organizationMember.role !== undefined,
    );
  }
}
