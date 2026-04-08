import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member statistics retrieval for a newly registered user with no content.
 *
 * Validates the primary success path for retrieving user statistics when a newly registered member has no content activity on the platform. Ensures that the stats endpoint correctly returns zero values for all metrics, confirming that account age, content counts, and activity timestamps are properly calculated and returned for new accounts.
 *
 * Special attention is given to verifying that last_active_at is null (not 0 or a timestamp) and that all integer count fields are correctly typed as numbers rather than strings. The test also validates that metadata fields such as id and username are correctly returned from the authentication and stats flow.
 *
 * 1. Create a new member account via the join endpoint with randomized credentials.
 * 2. Use the returned authorization token to create an authenticated connection for stats calls.
 * 3. Call the stats endpoint to retrieve user statistics for the new member.
 * 4. Validate that karma is 0 (integer, not string).
 * 5. Validate that post_count, comment_count, community_count, and subscription_count are all 0 (integers).
 * 6. Validate that account_age_days is 0 or 1 (calculated from created_at to now).
 * 7. Validate that last_active_at is null (no activity since creation).
 * 8. Validate that id and username are correctly returned and match expected formats.
 */
export async function test_api_user_stats_new_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new member account with randomized credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create authenticated connection using the returned access token
  const statsConnection: api.IConnection = { host: connection.host };
  statsConnection.headers = {
    Authorization: `Bearer ${memberAuth.token.access}`,
  };
  // 3. Retrieve stats for the newly created member
  const stats =
    await api.functional.redditPlatform.member.users.me.stats(statsConnection);
  typia.assert(stats);
  // 4. Validate karma is 0
  TestValidator.equals("karma is zero", stats.karma, 0);
  // 5. Validate post_count is 0
  TestValidator.equals("post_count is zero", stats.post_count, 0);
  // 6. Validate comment_count is 0
  TestValidator.equals("comment_count is zero", stats.comment_count, 0);
  // 7. Validate community_count is 0
  TestValidator.equals("community_count is zero", stats.community_count, 0);
  // 8. Validate subscription_count is 0
  TestValidator.equals(
    "subscription_count is zero",
    stats.subscription_count,
    0,
  );
  // 9. Validate account_age_days is 0 or 1
  TestValidator.predicate(
    "account_age_days is 0 or 1",
    stats.account_age_days === 0 || stats.account_age_days === 1,
  );
  // 10. Validate last_active_at is null
  TestValidator.equals("last_active_at is null", stats.last_active_at, null);
  // 11. Validate id is a valid UUID
  typia.assert<string & tags.Format<"uuid">>(stats.id);
  // 12. Validate username matches expected pattern (alphanumeric + underscore, 3-20 chars)
  const usernamePattern = /^[a-zA-Z0-9_]{3,20}$/;
  TestValidator.predicate(
    "username matches pattern",
    usernamePattern.test(stats.username),
  );
}
