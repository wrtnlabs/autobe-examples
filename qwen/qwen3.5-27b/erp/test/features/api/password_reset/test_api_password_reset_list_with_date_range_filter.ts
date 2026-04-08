import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMemberPasswordReset";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the password reset listing functionality with date range filtering for creation and expiration timestamps.
 *
 * Validates the complete password reset token listing flow with various date range filters. Tests filtering by creation date range (created_at_gte, created_at_lte), expiration date range (expired_at_gte, expired_at_lte), combined filters, and token pattern matching. Ensures pagination metadata accurately reflects filtered results.
 *
 * Special attention is given to verifying that date range filters correctly intersect results and that empty result sets return proper pagination metadata.
 *
 * 1. Authenticate as a member to access password reset records
 * 2. Create a password reset request body with creation date range filters
 * 3. Call the password reset list endpoint and verify response structure
 * 4. Test with expiration date range filters
 * 5. Test with combined creation and expiration date range filters
 * 6. Test with date ranges that return no results
 * 7. Verify token_pattern filter works for partial matching
 * 8. Verify pagination metadata accuracy
 */
export async function test_api_password_reset_list_with_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Test with creation date range filters
  const now = new Date();
  const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days in future
  const creationFilterBody = {
    created_at_gte: pastDate.toISOString(),
    created_at_lte: futureDate.toISOString(),
    page: 1,
    limit: 20,
  } satisfies IHrmTimeTrackMemberPasswordReset.IRequest;
  const creationResult =
    await api.functional.hrmTimeTrack.member.password_resets.index(
      memberConnection,
      { body: creationFilterBody },
    );
  typia.assert(creationResult);
  // Verify pagination metadata
  TestValidator.equals(
    "creation filter pagination current page",
    creationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "creation filter pagination limit",
    creationResult.pagination.limit,
    20,
  );
  // Verify all returned tokens are within the creation date range
  await ArrayUtil.asyncForEach(creationResult.data, async (reset) => {
    const createdAt = new Date(reset.created_at);
    TestValidator.predicate(
      `token ${reset.id} created_at >= gte`,
      createdAt >= pastDate,
    );
    TestValidator.predicate(
      `token ${reset.id} created_at <= lte`,
      createdAt <= futureDate,
    );
  });
  // 3. Test with expiration date range filters
  const expiredPast = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const expiredFuture = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days in future
  const expirationFilterBody = {
    expired_at_gte: expiredPast.toISOString(),
    expired_at_lte: expiredFuture.toISOString(),
    page: 1,
    limit: 20,
  } satisfies IHrmTimeTrackMemberPasswordReset.IRequest;
  const expirationResult =
    await api.functional.hrmTimeTrack.member.password_resets.index(
      memberConnection,
      { body: expirationFilterBody },
    );
  typia.assert(expirationResult);
  // Verify all returned tokens expire within the specified range
  await ArrayUtil.asyncForEach(expirationResult.data, async (reset) => {
    const expiredAt = new Date(reset.expired_at);
    TestValidator.predicate(
      `token ${reset.id} expired_at >= gte`,
      expiredAt >= expiredPast,
    );
    TestValidator.predicate(
      `token ${reset.id} expired_at <= lte`,
      expiredAt <= expiredFuture,
    );
  });
  // 4. Test with combined filters (creation and expiration date ranges)
  const combinedFilterBody = {
    created_at_gte: pastDate.toISOString(),
    created_at_lte: futureDate.toISOString(),
    expired_at_gte: expiredPast.toISOString(),
    expired_at_lte: expiredFuture.toISOString(),
    page: 1,
    limit: 20,
  } satisfies IHrmTimeTrackMemberPasswordReset.IRequest;
  const combinedResult =
    await api.functional.hrmTimeTrack.member.password_resets.index(
      memberConnection,
      { body: combinedFilterBody },
    );
  typia.assert(combinedResult);
  // Verify all tokens satisfy both creation and expiration date ranges
  await ArrayUtil.asyncForEach(combinedResult.data, async (reset) => {
    const createdAt = new Date(reset.created_at);
    const expiredAt = new Date(reset.expired_at);
    TestValidator.predicate(
      `token ${reset.id} satisfies creation date range`,
      createdAt >= pastDate && createdAt <= futureDate,
    );
    TestValidator.predicate(
      `token ${reset.id} satisfies expiration date range`,
      expiredAt >= expiredPast && expiredAt <= expiredFuture,
    );
  });
  // 5. Test with date ranges that return no results (very old dates)
  const veryOldDate = new Date(2020, 0, 1); // January 1, 2020
  const veryOldFuture = new Date(2020, 0, 31); // January 31, 2020
  const emptyFilterBody = {
    created_at_gte: veryOldDate.toISOString(),
    created_at_lte: veryOldFuture.toISOString(),
    page: 1,
    limit: 20,
  } satisfies IHrmTimeTrackMemberPasswordReset.IRequest;
  const emptyResult =
    await api.functional.hrmTimeTrack.member.password_resets.index(
      memberConnection,
      { body: emptyFilterBody },
    );
  typia.assert(emptyResult);
  // Verify empty result has correct pagination
  TestValidator.equals(
    "empty result data array is empty",
    emptyResult.data.length,
    0,
  );
  TestValidator.predicate(
    "empty result pagination records is 0",
    emptyResult.pagination.records === 0,
  );
  TestValidator.predicate(
    "empty result pagination pages is 0",
    emptyResult.pagination.pages === 0,
  );
  // 6. Test token_pattern filter for partial matching
  const patternFilterBody = {
    token_pattern: "test",
    page: 1,
    limit: 20,
  } satisfies IHrmTimeTrackMemberPasswordReset.IRequest;
  const patternResult =
    await api.functional.hrmTimeTrack.member.password_resets.index(
      memberConnection,
      { body: patternFilterBody },
    );
  typia.assert(patternResult);
  // Verify all returned tokens contain the pattern (case-insensitive)
  await ArrayUtil.asyncForEach(patternResult.data, async (reset) => {
    TestValidator.predicate(
      `token ${reset.id} contains pattern`,
      reset.token.toLowerCase().includes("test".toLowerCase()),
    );
  });
  // 7. Verify pagination metadata accuracy
  const paginationFilterBody = {
    page: 1,
    limit: 10,
  } satisfies IHrmTimeTrackMemberPasswordReset.IRequest;
  const paginationResult =
    await api.functional.hrmTimeTrack.member.password_resets.index(
      memberConnection,
      { body: paginationFilterBody },
    );
  typia.assert(paginationResult);
  // Verify data array length doesn't exceed limit
  TestValidator.predicate(
    "data array length doesn't exceed limit",
    paginationResult.data.length <= paginationResult.pagination.limit,
  );
  // Verify records count matches or exceeds data length
  TestValidator.predicate(
    "pagination records >= data length",
    paginationResult.pagination.records >= paginationResult.data.length,
  );
  // Verify pages calculation is correct
  const expectedPages = Math.ceil(
    paginationResult.pagination.records / paginationResult.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculation",
    paginationResult.pagination.pages,
    expectedPages,
  );
}
