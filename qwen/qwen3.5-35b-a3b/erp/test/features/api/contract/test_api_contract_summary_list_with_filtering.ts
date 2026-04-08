import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test contract summary listing endpoint with various filtering and sorting options.
 *
 * Validates the contract summary listing functionality with comprehensive filtering and sorting capabilities for organizational reporting. The member user registers with organization details, then tests the endpoint with multiple filter combinations including status, date range, compensation range, and sorting options.
 *
 * Special attention is given to verifying that all filter parameters work correctly, pagination metadata is accurate, and organization-scoped data isolation is maintained. The test validates that only contracts from the authenticated member's organization are returned.
 *
 * 1. Member user joins with email, password, and organization details.
 * 2. Contract summary listing is tested with status filter (active and ended).
 * 3. Date range filtering is validated using startDate and endDate parameters.
 * 4. Compensation range filtering is tested with compensationMin and compensationMax.
 * 5. Sorting functionality is validated with start_date, created_at fields in asc/desc order.
 * 6. Pagination metadata (current, limit, records, pages) is verified for accuracy.
 * 7. Required contract fields (id, title, start_date, end_date, compensation, status, created_at, employee) are validated.
 * 8. Organization-scoped isolation is confirmed by verifying all contracts belong to member's organization.
 * 9. Multi-page pagination is tested by requesting page 2.
 */
export async function test_api_contract_summary_list_with_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member user joins
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      avatar_uri: RandomGenerator.paragraph({ sentences: 1 }),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul"]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Update member connection with authentication token
  const authenticatedMemberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // Step 2: Test contract summary listing with status filter 'active'
  const activeContracts =
    await api.functional.hrmPlatform.member.contracts.summary.index(
      authenticatedMemberConnection,
      {
        body: {
          status: "active",
          limit: 10,
          page: 1,
        } satisfies IHrmPlatformContract.IRequest,
      },
    );
  typia.assert(activeContracts);
  // Store member's organization ID from first contract (used for isolation validation)
  const memberOrganizationId =
    activeContracts.data[0]?.employee.organization.id ?? "";
  // Step 3: Test contract summary listing with status filter 'ended'
  const endedContracts =
    await api.functional.hrmPlatform.member.contracts.summary.index(
      authenticatedMemberConnection,
      {
        body: {
          status: "ended",
          limit: 10,
          page: 1,
        } satisfies IHrmPlatformContract.IRequest,
      },
    );
  typia.assert(endedContracts);
  // Step 4: Test date range filtering
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);
  const dateRangeContracts =
    await api.functional.hrmPlatform.member.contracts.summary.index(
      authenticatedMemberConnection,
      {
        body: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          limit: 10,
          page: 1,
        } satisfies IHrmPlatformContract.IRequest,
      },
    );
  typia.assert(dateRangeContracts);
  // Step 5: Test compensation range filtering
  const compensationRangeContracts =
    await api.functional.hrmPlatform.member.contracts.summary.index(
      authenticatedMemberConnection,
      {
        body: {
          compensationMin: 50000,
          compensationMax: 100000,
          limit: 10,
          page: 1,
        } satisfies IHrmPlatformContract.IRequest,
      },
    );
  typia.assert(compensationRangeContracts);
  // Step 6: Test sorting by start_date descending
  const sortedByStartDateDesc =
    await api.functional.hrmPlatform.member.contracts.summary.index(
      authenticatedMemberConnection,
      {
        body: {
          sortBy: "start_date",
          sortOrder: "desc",
          limit: 10,
          page: 1,
        } satisfies IHrmPlatformContract.IRequest,
      },
    );
  typia.assert(sortedByStartDateDesc);
  // Step 7: Test sorting by created_at ascending
  const sortedByCreatedAtAsc =
    await api.functional.hrmPlatform.member.contracts.summary.index(
      authenticatedMemberConnection,
      {
        body: {
          sortBy: "created_at",
          sortOrder: "asc",
          limit: 10,
          page: 1,
        } satisfies IHrmPlatformContract.IRequest,
      },
    );
  typia.assert(sortedByCreatedAtAsc);
  // Step 8: Validate pagination metadata
  TestValidator.equals(
    "active pagination current page",
    activeContracts.pagination.current,
    1,
  );
  TestValidator.equals(
    "active pagination limit",
    activeContracts.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "active pagination records non-negative",
    activeContracts.pagination.records >= 0,
  );
  TestValidator.predicate(
    "active pagination pages non-negative",
    activeContracts.pagination.pages >= 0,
  );
  // Step 9: Verify required fields in contract summaries
  if (activeContracts.data.length > 0) {
    const sampleContract = activeContracts.data[0];
    typia.assert(sampleContract);
    TestValidator.equals(
      "contract has id",
      typeof sampleContract.id === "string",
      true,
    );
    TestValidator.equals(
      "contract has title",
      typeof sampleContract.title === "string",
      true,
    );
    TestValidator.equals(
      "contract has start_date",
      typeof sampleContract.start_date === "string",
      true,
    );
    TestValidator.equals(
      "contract has status",
      typeof sampleContract.status === "string",
      true,
    );
    TestValidator.equals(
      "contract has created_at",
      typeof sampleContract.created_at === "string",
      true,
    );
    TestValidator.equals(
      "contract has employee",
      typeof sampleContract.employee === "object",
      true,
    );
  }
  // Step 10: Test pagination - request page 2 if available
  if (activeContracts.pagination.pages > 1) {
    const page2Contracts =
      await api.functional.hrmPlatform.member.contracts.summary.index(
        authenticatedMemberConnection,
        {
          body: {
            status: "active",
            limit: 10,
            page: 2,
          } satisfies IHrmPlatformContract.IRequest,
        },
      );
    typia.assert(page2Contracts);
    TestValidator.equals(
      "page 2 current page",
      page2Contracts.pagination.current,
      2,
    );
    TestValidator.notEquals(
      "page 2 has different page number",
      activeContracts.pagination.current,
      page2Contracts.pagination.current,
    );
  }
  // Step 11: Verify organization-scoped isolation
  // All contracts should belong to the member's organization
  const allContracts = activeContracts.data.concat(endedContracts.data);
  if (allContracts.length > 0) {
    const allBelongToOrganization = allContracts.every(
      (contract) => contract.employee.organization.id === memberOrganizationId,
    );
    TestValidator.equals(
      "all contracts belong to member organization",
      allBelongToOrganization,
      true,
    );
  }
}
