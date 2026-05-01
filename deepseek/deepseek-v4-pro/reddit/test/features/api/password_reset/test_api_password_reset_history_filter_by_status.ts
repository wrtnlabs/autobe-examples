import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityHubMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test password reset history filtering by consumed and expiration status.
 *
 * Validates the PATCH /communityHub/members/{username}/password-resets endpoint's ability to filter password reset tokens by whether they have been consumed (used filter) and whether they have expired (expired filter). Confirms that filtered result sets contain only records matching the specified criteria and that pagination record counts reflect the narrowing effect of each filter.
 *
 * 1. Query without filters to establish a baseline record count.
 * 2. Filter by used=true, verify every returned token has a non-null used_at.
 * 3. Filter by used=false, verify every returned token has a null used_at.
 * 4. Filter by expired=true, verify every returned token has expired_at in the past.
 * 5. Filter by expired=false, verify every returned token has expired_at at or after now.
 * 6. Confirm filtered record counts are subsets of the unfiltered total.
 */
export async function test_api_password_reset_history_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const username = RandomGenerator.alphaNumeric(8);
  const now = new Date();
  // 1. Baseline query without filters
  const allResult =
    await api.functional.communityHub.members.password_resets.index(
      memberConnection,
      {
        username,
        body: {} satisfies ICommunityHubMemberPasswordReset.IRequest,
      },
    );
  typia.assert(allResult);
  // 2. Filter by used=true (consumed tokens only)
  const usedTrueResult =
    await api.functional.communityHub.members.password_resets.index(
      memberConnection,
      {
        username,
        body: {
          used: true,
        } satisfies ICommunityHubMemberPasswordReset.IRequest,
      },
    );
  typia.assert(usedTrueResult);
  TestValidator.predicate(
    "used=true: every token has non-null used_at",
    usedTrueResult.data.every((item) => item.used_at !== null),
  );
  // 3. Filter by used=false (unconsumed tokens only)
  const usedFalseResult =
    await api.functional.communityHub.members.password_resets.index(
      memberConnection,
      {
        username,
        body: {
          used: false,
        } satisfies ICommunityHubMemberPasswordReset.IRequest,
      },
    );
  typia.assert(usedFalseResult);
  TestValidator.predicate(
    "used=false: every token has null used_at",
    usedFalseResult.data.every((item) => item.used_at === null),
  );
  // 4. Filter by expired=true (past expiration only)
  const expiredTrueResult =
    await api.functional.communityHub.members.password_resets.index(
      memberConnection,
      {
        username,
        body: {
          expired: true,
        } satisfies ICommunityHubMemberPasswordReset.IRequest,
      },
    );
  typia.assert(expiredTrueResult);
  TestValidator.predicate(
    "expired=true: every token has expired_at in the past",
    expiredTrueResult.data.every((item) => new Date(item.expired_at) < now),
  );
  // 5. Filter by expired=false (still valid tokens only)
  const expiredFalseResult =
    await api.functional.communityHub.members.password_resets.index(
      memberConnection,
      {
        username,
        body: {
          expired: false,
        } satisfies ICommunityHubMemberPasswordReset.IRequest,
      },
    );
  typia.assert(expiredFalseResult);
  TestValidator.predicate(
    "expired=false: every token has expired_at at or after now",
    expiredFalseResult.data.every((item) => new Date(item.expired_at) >= now),
  );
  // 6. Verify filtered counts are subsets of the unfiltered total
  TestValidator.predicate(
    "used=true record count does not exceed total",
    usedTrueResult.pagination.records <= allResult.pagination.records,
  );
  TestValidator.predicate(
    "used=false record count does not exceed total",
    usedFalseResult.pagination.records <= allResult.pagination.records,
  );
  TestValidator.predicate(
    "expired=true record count does not exceed total",
    expiredTrueResult.pagination.records <= allResult.pagination.records,
  );
  TestValidator.predicate(
    "expired=false record count does not exceed total",
    expiredFalseResult.pagination.records <= allResult.pagination.records,
  );
}
