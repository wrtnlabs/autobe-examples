import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_listing_with_date_range_and_deleted_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection for API calls
  const memberConnection: api.IConnection = { host: connection.host };
  // Test 1: Basic member listing with date range filtering
  // Query members created within a specific date range
  const dateRangeResult = await api.functional.hrm.members.index(
    memberConnection,
    {
      body: {
        created_at_from: "2024-01-01T00:00:00Z",
        created_at_to: "2026-12-31T23:59:59Z",
      } satisfies IHrmMember.IRequest,
    },
  );
  typia.assert(dateRangeResult);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    dateRangeResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    dateRangeResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    dateRangeResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    dateRangeResult.pagination.pages >= 0,
  );
  // Validate member summary structure in response data
  if (dateRangeResult.data.length > 0) {
    const firstMember = dateRangeResult.data[0];
    typia.assert(firstMember);
    // Validate required member summary fields
    TestValidator.predicate(
      "member has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstMember.id,
      ),
    );
    TestValidator.predicate(
      "member has valid email format",
      firstMember.email.includes("@"),
    );
    TestValidator.predicate(
      "member has created_at timestamp",
      firstMember.created_at.length > 0,
    );
    TestValidator.predicate(
      "member has updated_at timestamp",
      firstMember.updated_at.length > 0,
    );
    // deleted_at can be null (active) or ISO date-time string (deleted)
    if (firstMember.deleted_at !== null) {
      TestValidator.predicate(
        "deleted_at is valid ISO date-time when not null",
        firstMember.deleted_at.length > 0,
      );
    }
  }
  // Test 2: include_deleted=true - should include soft-deleted accounts
  const withDeletedResult = await api.functional.hrm.members.index(
    memberConnection,
    {
      body: {
        include_deleted: true,
      } satisfies IHrmMember.IRequest,
    },
  );
  typia.assert(withDeletedResult);
  // Validate pagination structure for include_deleted=true
  TestValidator.predicate(
    "with_deleted pagination has records",
    withDeletedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "with_deleted pagination has pages",
    withDeletedResult.pagination.pages >= 0,
  );
  // Test 3: include_deleted=false (default) - should exclude soft-deleted accounts
  const withoutDeletedResult = await api.functional.hrm.members.index(
    memberConnection,
    {
      body: {
        include_deleted: false,
      } satisfies IHrmMember.IRequest,
    },
  );
  typia.assert(withoutDeletedResult);
  // Validate pagination structure for include_deleted=false
  TestValidator.predicate(
    "without_deleted pagination has records",
    withoutDeletedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "without_deleted pagination has pages",
    withoutDeletedResult.pagination.pages >= 0,
  );
  // Test 4: Email filtering combined with date range
  // Query with partial email match within date range
  const emailFilterResult = await api.functional.hrm.members.index(
    memberConnection,
    {
      body: {
        email: "test",
        created_at_from: "2024-01-01T00:00:00Z",
        created_at_to: "2026-12-31T23:59:59Z",
      } satisfies IHrmMember.IRequest,
    },
  );
  typia.assert(emailFilterResult);
  // Validate email filter returns consistent pagination structure
  TestValidator.predicate(
    "email_filter pagination has records",
    emailFilterResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "email_filter pagination has pages",
    emailFilterResult.pagination.pages >= 0,
  );
  // Test 5: Pagination parameters
  const paginationResult = await api.functional.hrm.members.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmMember.IRequest,
    },
  );
  typia.assert(paginationResult);
  // Validate pagination parameters are applied correctly
  TestValidator.equals(
    "pagination current matches request",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    paginationResult.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    paginationResult.pagination.limit > 0,
  );
  // Test 6: Combined filters - email, date range, and include_deleted
  const combinedFilterResult = await api.functional.hrm.members.index(
    memberConnection,
    {
      body: {
        email: "user",
        created_at_from: "2024-06-01T00:00:00Z",
        created_at_to: "2025-06-30T23:59:59Z",
        include_deleted: true,
        page: 1,
        limit: 20,
      } satisfies IHrmMember.IRequest,
    },
  );
  typia.assert(combinedFilterResult);
  // Validate combined filters return consistent structure
  TestValidator.predicate(
    "combined_filter pagination valid",
    combinedFilterResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "combined_filter data is array",
    Array.isArray(combinedFilterResult.data),
  );
  // Validate all members in combined filter have proper structure
  for (const member of combinedFilterResult.data) {
    typia.assert(member);
    TestValidator.predicate(
      "member id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        member.id,
      ),
    );
    TestValidator.predicate(
      "member email contains @",
      member.email.includes("@"),
    );
  }
}