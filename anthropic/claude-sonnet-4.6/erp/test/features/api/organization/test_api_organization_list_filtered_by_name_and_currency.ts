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
import type { IPageIErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmOrganization";
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

export async function test_api_organization_list_filtered_by_name_and_currency(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and get an authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create three organizations with specific names and currencies
  const orgAlphaCorp =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `Alpha Corp ${RandomGenerator.alphaNumeric(6)}`,
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(orgAlphaCorp);
  const orgBetaInc = await generate_random_erp_hrm_member_organizations_create(
    memberConnection,
    {
      body: {
        name: `Beta Inc ${RandomGenerator.alphaNumeric(6)}`,
        currency: "EUR",
        timezone: "Asia/Seoul",
        fiscal_start_month: 1,
      },
    },
  );
  typia.assert(orgBetaInc);
  const orgAlphaTech =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `Alpha Tech ${RandomGenerator.alphaNumeric(6)}`,
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(orgAlphaTech);
  // 3. Name filter test (partial match, uppercase "Alpha")
  const nameFilterResult =
    await api.functional.erpHrm.member.organizations.index(memberConnection, {
      body: { name: "Alpha" } satisfies IErpHrmOrganization.IRequest,
    });
  typia.assert(nameFilterResult);
  TestValidator.predicate(
    "Alpha Corp should be in name-filtered result",
    nameFilterResult.data.some((org) => org.id === orgAlphaCorp.id),
  );
  TestValidator.predicate(
    "Alpha Tech should be in name-filtered result",
    nameFilterResult.data.some((org) => org.id === orgAlphaTech.id),
  );
  TestValidator.predicate(
    "Beta Inc should NOT be in name-filtered result",
    !nameFilterResult.data.some((org) => org.id === orgBetaInc.id),
  );
  // 4. Name filter test (case-insensitive, lowercase "alpha")
  const nameFilterLowerResult =
    await api.functional.erpHrm.member.organizations.index(memberConnection, {
      body: { name: "alpha" } satisfies IErpHrmOrganization.IRequest,
    });
  typia.assert(nameFilterLowerResult);
  TestValidator.predicate(
    "Alpha Corp should be in lowercase-name-filtered result",
    nameFilterLowerResult.data.some((org) => org.id === orgAlphaCorp.id),
  );
  TestValidator.predicate(
    "Alpha Tech should be in lowercase-name-filtered result",
    nameFilterLowerResult.data.some((org) => org.id === orgAlphaTech.id),
  );
  TestValidator.predicate(
    "Beta Inc should NOT be in lowercase-name-filtered result",
    !nameFilterLowerResult.data.some((org) => org.id === orgBetaInc.id),
  );
  // 5. Currency filter test (exact match, USD)
  const currencyFilterResult =
    await api.functional.erpHrm.member.organizations.index(memberConnection, {
      body: { currency: "USD" } satisfies IErpHrmOrganization.IRequest,
    });
  typia.assert(currencyFilterResult);
  TestValidator.predicate(
    "Alpha Corp (USD) should be in currency-filtered result",
    currencyFilterResult.data.some((org) => org.id === orgAlphaCorp.id),
  );
  TestValidator.predicate(
    "Alpha Tech (USD) should be in currency-filtered result",
    currencyFilterResult.data.some((org) => org.id === orgAlphaTech.id),
  );
  TestValidator.predicate(
    "Beta Inc (EUR) should NOT be in currency-filtered result",
    !currencyFilterResult.data.some((org) => org.id === orgBetaInc.id),
  );
  // 6. Combined filter test (name contains 'Alpha' AND currency is 'USD')
  const combinedFilterResult =
    await api.functional.erpHrm.member.organizations.index(memberConnection, {
      body: {
        name: "Alpha",
        currency: "USD",
      } satisfies IErpHrmOrganization.IRequest,
    });
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "Alpha Corp should be in combined-filtered result",
    combinedFilterResult.data.some((org) => org.id === orgAlphaCorp.id),
  );
  TestValidator.predicate(
    "Alpha Tech should be in combined-filtered result",
    combinedFilterResult.data.some((org) => org.id === orgAlphaTech.id),
  );
  TestValidator.predicate(
    "Beta Inc should NOT be in combined-filtered result",
    !combinedFilterResult.data.some((org) => org.id === orgBetaInc.id),
  );
  // 7. Sort test (sort by name ascending)
  const sortResult = await api.functional.erpHrm.member.organizations.index(
    memberConnection,
    {
      body: {
        sort: { field: "name", direction: "asc" },
      } satisfies IErpHrmOrganization.IRequest,
    },
  );
  typia.assert(sortResult);
  const sortedNames = sortResult.data.map((org) => org.name);
  const expectedSortedNames = [...sortedNames].sort((a, b) =>
    a.localeCompare(b),
  );
  TestValidator.equals(
    "Organizations should be sorted alphabetically by name ascending",
    sortedNames,
    expectedSortedNames,
  );
  // 8. No-match filter test (JPY currency - not used by any org)
  const noMatchResult = await api.functional.erpHrm.member.organizations.index(
    memberConnection,
    {
      body: { currency: "JPY" } satisfies IErpHrmOrganization.IRequest,
    },
  );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "No-match filter should return empty data array",
    noMatchResult.data.length,
    0,
  );
  TestValidator.equals(
    "No-match filter should return records: 0",
    noMatchResult.pagination.records as number,
    0,
  );
}
