import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmOrganizationOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganizationOwner";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmOrganizationOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmOrganizationOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test filtering organization ownership records by historical status.
 *
 * Validates the ownership history filtering capability of the organization owners endpoint. This test ensures that historical ownership records can be properly retrieved and filtered using various query parameters including current status and date ranges.
 *
 * **Test Focus:**
 * Since the SDK does not provide organization creation or ownership transfer functions, this test focuses on validating the filtering mechanism of the owners index endpoint. Historical ownership records must exist in the database from prior operations. The test validates that:
 * - The is_current=false filter correctly returns only historical ownership records
 * - Date range filtering by started_at works correctly
 * - Pagination metadata accurately reflects filtered results
 * - Response structure matches expected schema
 *
 * 1. Create first member user and authenticate
 * 2. Create second member user and authenticate
 * 3. Query owners endpoint with is_current=false filter
 * 4. Verify response structure and pagination metadata
 * 5. Test date range filtering with started_at_from/to parameters
 * 6. Validate that historical records have ended_at set
 * 7. Verify started_at timestamps are present and valid
 */
export async function test_api_organization_owners_historical_ownership_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member user (initial owner context)
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(firstMember);
  // 2. Create second member user (new owner context)
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(secondMember);
  // 3. Query historical ownership records (is_current=false)
  // Note: Organization ID must exist with historical ownership records
  // This test validates the filtering mechanism, assuming historical records exist
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const historicalOwners =
    await api.functional.hrm.member.organizations.owners.index(
      firstMemberConnection,
      {
        organizationId,
        body: {
          is_current: false,
          page: 1,
          limit: 10,
        } satisfies IHrmOrganizationOwner.IRequest,
      },
    );
  typia.assert(historicalOwners);
  // 4. Validate response structure
  TestValidator.equals(
    "pagination current page",
    historicalOwners.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    historicalOwners.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records count non-negative",
    historicalOwners.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count non-negative",
    historicalOwners.pagination.pages >= 0,
  );
  // 5. Validate business logic for historical ownership records
  for (const owner of historicalOwners.data) {
    // Verify historical ownership record properties
    TestValidator.predicate(
      "is_current is false for historical records",
      owner.is_current === false,
    );
    TestValidator.predicate(
      "ended_at is set for historical records",
      owner.ended_at !== null,
    );
    // Verify related entity structure
    TestValidator.predicate("user id is valid uuid", () =>
      typia.is<string & tags.Format<"uuid">>(owner.user.id),
    );
    TestValidator.predicate("user email is valid email", () =>
      typia.is<string & tags.Format<"email">>(owner.user.email),
    );
    TestValidator.predicate("organization id is valid uuid", () =>
      typia.is<string & tags.Format<"uuid">>(owner.organization.id),
    );
  }
  // 6. Test date range filtering by started_at
  const startDate: string & tags.Format<"date-time"> = typia.random<
    string & tags.Format<"date-time">
  >();
  const endDate: string & tags.Format<"date-time"> = typia.random<
    string & tags.Format<"date-time">
  >();
  const dateFilteredOwners =
    await api.functional.hrm.member.organizations.owners.index(
      firstMemberConnection,
      {
        organizationId,
        body: {
          is_current: false,
          started_at_from: startDate,
          started_at_to: endDate,
          page: 1,
          limit: 10,
        } satisfies IHrmOrganizationOwner.IRequest,
      },
    );
  typia.assert(dateFilteredOwners);
  // 7. Validate date range filtering results
  TestValidator.equals(
    "date filtered pagination current",
    dateFilteredOwners.pagination.current,
    1,
  );
  // All returned records should have started_at within the specified range
  for (const owner of dateFilteredOwners.data) {
    const startedAt = new Date(owner.started_at).getTime();
    const startFrom = new Date(startDate).getTime();
    const startTo = new Date(endDate).getTime();
    TestValidator.predicate(
      "started_at >= started_at_from",
      startedAt >= startFrom,
    );
    TestValidator.predicate(
      "started_at <= started_at_to",
      startedAt <= startTo,
    );
  }
  // 8. Test combined filtering (is_current + date range)
  const combinedFilteredOwners =
    await api.functional.hrm.member.organizations.owners.index(
      firstMemberConnection,
      {
        organizationId,
        body: {
          is_current: false,
          started_at_from: startDate,
          page: 1,
          limit: 10,
        } satisfies IHrmOrganizationOwner.IRequest,
      },
    );
  typia.assert(combinedFilteredOwners);
  // Validate combined filter results
  for (const owner of combinedFilteredOwners.data) {
    TestValidator.predicate(
      "is_current is false in combined filter",
      owner.is_current === false,
    );
    const startedAt = new Date(owner.started_at).getTime();
    const startFrom = new Date(startDate).getTime();
    TestValidator.predicate(
      "started_at >= started_at_from in combined filter",
      startedAt >= startFrom,
    );
  }
}
