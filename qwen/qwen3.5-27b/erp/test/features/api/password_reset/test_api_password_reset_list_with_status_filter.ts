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
 * Test password reset listing functionality with status filtering for HRM Time Track members.
 *
 * Validates the complete password reset listing workflow including member authentication, status-based filtering (unused, used, expired), pagination metadata verification, and record structure validation. Ensures that password reset tokens are correctly filtered by their current status and that all returned records contain the expected fields with proper null handling for used_at timestamps.
 *
 * Special attention is given to verifying the status filtering logic: unused tokens have null used_at and future expiration, used tokens have non-null used_at, and expired tokens have past expiration with null used_at. Token values are expected to be masked for security in responses.
 *
 * 1. Authenticate as a member using the join endpoint with random credentials.
 * 2. Create member-specific connection for authorized API calls.
 * 3. Call password reset list endpoint with status='unused' filter.
 * 4. Validate pagination metadata contains current page, limit, total records, and total pages.
 * 5. Verify each password reset record contains id, token, created_at, expired_at, used_at, and member information.
 * 6. Confirm all 'unused' tokens have used_at=null and expired_at in the future.
 * 7. Call password reset list endpoint with status='used' filter.
 * 8. Verify all 'used' tokens have non-null used_at timestamps.
 * 9. Call password reset list endpoint with status='expired' filter.
 * 10. Confirm all 'expired' tokens have expired_at in the past and used_at=null.
 * 11. Validate default sorting by created_at descending (most recent first).
 */
export async function test_api_password_reset_list_with_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Test with status='unused' filter
  const unusedBody = {
    status: "unused",
    page: 1,
    limit: 20,
  } satisfies IHrmTimeTrackMemberPasswordReset.IRequest;
  const unusedResult =
    await api.functional.hrmTimeTrack.member.password_resets.index(
      memberConnection,
      { body: unusedBody },
    );
  typia.assert(unusedResult);
  // 3. Validate pagination for unused tokens
  TestValidator.equals(
    "unused pagination current page",
    unusedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "unused pagination limit",
    unusedResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "unused pagination records non-negative",
    unusedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "unused pagination pages non-negative",
    unusedResult.pagination.pages >= 0,
  );
  // 4. Validate each unused token record
  await ArrayUtil.asyncForEach(unusedResult.data, async (reset) => {
    typia.assert(reset);
    // Verify record structure
    TestValidator.predicate(
      "unused token has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        reset.id,
      ),
    );
    TestValidator.predicate(
      "unused token has non-empty token value",
      reset.token.length > 0,
    );
    TestValidator.predicate(
      "unused token has created_at timestamp",
      reset.created_at.length > 0,
    );
    TestValidator.predicate(
      "unused token has expired_at timestamp",
      reset.expired_at.length > 0,
    );
    // Verify unused status: used_at is null
    TestValidator.equals("unused token used_at is null", reset.used_at, null);
    // Verify unused status: expired_at is in the future
    const expiredAt = new Date(reset.expired_at).getTime();
    const now = Date.now();
    TestValidator.predicate(
      "unused token expired_at is in future",
      expiredAt > now,
    );
    // Verify member information exists
    typia.assert(reset.member);
    TestValidator.predicate(
      "unused token has member id",
      reset.member.id.length > 0,
    );
    TestValidator.predicate(
      "unused token has member email",
      reset.member.email.length > 0,
    );
  });
  // 5. Test with status='used' filter
  const usedBody = {
    status: "used",
    page: 1,
    limit: 20,
  } satisfies IHrmTimeTrackMemberPasswordReset.IRequest;
  const usedResult =
    await api.functional.hrmTimeTrack.member.password_resets.index(
      memberConnection,
      { body: usedBody },
    );
  typia.assert(usedResult);
  // 6. Validate pagination for used tokens
  TestValidator.equals(
    "used pagination current page",
    usedResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "used pagination records non-negative",
    usedResult.pagination.records >= 0,
  );
  // 7. Validate each used token record
  await ArrayUtil.asyncForEach(usedResult.data, async (reset) => {
    typia.assert(reset);
    // Verify used status: used_at is not null
    TestValidator.predicate(
      "used token used_at is not null",
      reset.used_at !== null,
    );
    // Verify used_at is a valid timestamp
    if (reset.used_at !== null) {
      TestValidator.predicate(
        "used token used_at is valid date-time",
        reset.used_at.length > 0,
      );
    }
    // Verify member information exists
    typia.assert(reset.member);
    TestValidator.predicate(
      "used token has member id",
      reset.member.id.length > 0,
    );
  });
  // 8. Test with status='expired' filter
  const expiredBody = {
    status: "expired",
    page: 1,
    limit: 20,
  } satisfies IHrmTimeTrackMemberPasswordReset.IRequest;
  const expiredResult =
    await api.functional.hrmTimeTrack.member.password_resets.index(
      memberConnection,
      { body: expiredBody },
    );
  typia.assert(expiredResult);
  // 9. Validate pagination for expired tokens
  TestValidator.equals(
    "expired pagination current page",
    expiredResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "expired pagination records non-negative",
    expiredResult.pagination.records >= 0,
  );
  // 10. Validate each expired token record
  await ArrayUtil.asyncForEach(expiredResult.data, async (reset) => {
    typia.assert(reset);
    // Verify expired status: used_at is null
    TestValidator.equals("expired token used_at is null", reset.used_at, null);
    // Verify expired status: expired_at is in the past
    const expiredAt = new Date(reset.expired_at).getTime();
    const now = Date.now();
    TestValidator.predicate(
      "expired token expired_at is in past",
      expiredAt < now,
    );
    // Verify member information exists
    typia.assert(reset.member);
    TestValidator.predicate(
      "expired token has member id",
      reset.member.id.length > 0,
    );
  });
  // 11. Verify default sorting by created_at descending
  if (unusedResult.data.length > 1) {
    await ArrayUtil.asyncForEach(
      unusedResult.data.slice(0, -1),
      async (reset, index) => {
        const nextReset = unusedResult.data[index + 1];
        const currentCreatedAt = new Date(reset.created_at).getTime();
        const nextCreatedAt = new Date(nextReset.created_at).getTime();
        TestValidator.predicate(
          `unused tokens sorted by created_at descending at index ${index}`,
          currentCreatedAt >= nextCreatedAt,
        );
      },
    );
  }
}
