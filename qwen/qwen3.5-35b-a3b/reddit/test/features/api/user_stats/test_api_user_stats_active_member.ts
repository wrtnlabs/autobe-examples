import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformUserStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving user statistics for an active member.
 *
 * Validates the user statistics retrieval flow including member authentication and stats API response structure. Ensures that the statistics endpoint returns all required fields with valid data types and values.
 *
 * Special attention is given to verifying that the stats response contains all required fields and that all count fields are valid integers.
 *
 * 1. Member registers with valid credentials via authorize_member_join utility function
 * 2. Member retrieves their own statistics via GET /redditPlatform/member/users/{username}/stats endpoint
 * 3. Validates stats response contains all required fields: karma, posts_count, comments_count, subscriptions_count
 * 4. Validates all count fields are valid integers
 * 5. Ensures response contains only public statistics without sensitive data
 */
export async function test_api_user_stats_active_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Retrieve member statistics
  const stats = await api.functional.redditPlatform.member.users.stats(
    memberConnection,
    {
      username: member.username,
    },
  );
  typia.assert(stats);
  // 3. Validate all counts are valid integers
  TestValidator.predicate("karma is integer", Number.isInteger(stats.karma));
  TestValidator.predicate(
    "posts_count is integer",
    Number.isInteger(stats.posts_count),
  );
  TestValidator.predicate(
    "comments_count is integer",
    Number.isInteger(stats.comments_count),
  );
  TestValidator.predicate(
    "subscriptions_count is integer",
    Number.isInteger(stats.subscriptions_count),
  );
  // 4. Validate all counts are non-negative
  TestValidator.predicate("karma is non-negative", stats.karma >= 0);
  TestValidator.predicate(
    "posts_count is non-negative",
    stats.posts_count >= 0,
  );
  TestValidator.predicate(
    "comments_count is non-negative",
    stats.comments_count >= 0,
  );
  TestValidator.predicate(
    "subscriptions_count is non-negative",
    stats.subscriptions_count >= 0,
  );
  // 5. Ensure response contains only public statistics
  TestValidator.predicate("email not in response", !("email" in stats));
  TestValidator.predicate(
    "password_hash not in response",
    !("password_hash" in stats),
  );
  TestValidator.predicate("id not in response", !("id" in stats));
}
