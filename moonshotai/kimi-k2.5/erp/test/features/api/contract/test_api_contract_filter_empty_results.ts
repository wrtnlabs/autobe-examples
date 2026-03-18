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

export async function test_api_contract_filter_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member to authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create another member to be the organization member
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMember = await authorize_member_join(otherMemberConnection, {});
  typia.assert(otherMember);
  // Create organization member
  const organizationMember =
    await generate_random_erp_hrm_member_organization_members_create(
      memberConnection,
      {
        body: {
          organizationId: organization.id,
          userId: otherMember.id,
        },
      },
    );
  typia.assert(organizationMember);
  // 4. Create contract with specific attributes (pay_rate=50000, employment_type='full-time')
  const contract = await generate_random_erp_hrm_member_contracts_create(
    memberConnection,
    {
      body: {
        organization_member_id: organizationMember.id,
        employment_type: "full-time",
        pay_rate: 50000,
        pay_period: "monthly",
        working_hours_per_week: 40,
      },
    },
  );
  typia.assert(contract);
  // 5. Search with conflicting filters that should return empty results
  // Test: payRateMax that excludes the created contract (50000 > 30000)
  const resultByPayRate = await api.functional.erpHrm.member.contracts.index(
    memberConnection,
    {
      body: {
        payRateMax: 30000,
      } satisfies IErpHrmContract.IRequest,
    },
  );
  typia.assert(resultByPayRate);
  TestValidator.equals(
    "data array empty for pay rate filter",
    resultByPayRate.data.length,
    0,
  );
  TestValidator.equals(
    "records is 0 for pay rate filter",
    resultByPayRate.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages is 0 for pay rate filter",
    resultByPayRate.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current is 1 for pay rate filter",
    resultByPayRate.pagination.current,
    1,
  );
  // Test: Non-existent organizationMemberId
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();
  const resultByMemberId = await api.functional.erpHrm.member.contracts.index(
    memberConnection,
    {
      body: {
        organizationMemberId: nonExistentMemberId,
      } satisfies IErpHrmContract.IRequest,
    },
  );
  typia.assert(resultByMemberId);
  TestValidator.equals(
    "data array empty for non-existent member id",
    resultByMemberId.data.length,
    0,
  );
  TestValidator.equals(
    "records is 0 for non-existent member id",
    resultByMemberId.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages is 0 for non-existent member id",
    resultByMemberId.pagination.pages,
    0,
  );
  // Test: employment_type filter that doesn't match any records
  const resultByEmploymentType =
    await api.functional.erpHrm.member.contracts.index(memberConnection, {
      body: {
        employmentType: "part-time",
      } satisfies IErpHrmContract.IRequest,
    });
  typia.assert(resultByEmploymentType);
  TestValidator.equals(
    "data array empty for non-matching employment type",
    resultByEmploymentType.data.length,
    0,
  );
  TestValidator.equals(
    "records is 0 for non-matching employment type",
    resultByEmploymentType.pagination.records,
    0,
  );
  // Test: Combining multiple restrictive filters
  const resultCombined = await api.functional.erpHrm.member.contracts.index(
    memberConnection,
    {
      body: {
        employmentType: "contract",
        payRateMin: 100000,
        payRateMax: 200000,
        isActive: false,
      } satisfies IErpHrmContract.IRequest,
    },
  );
  typia.assert(resultCombined);
  TestValidator.equals(
    "data array empty for combined filters",
    resultCombined.data.length,
    0,
  );
  TestValidator.equals(
    "records is 0 for combined filters",
    resultCombined.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages is 0 for combined filters",
    resultCombined.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current is 1 for combined filters",
    resultCombined.pagination.current,
    1,
  );
}
