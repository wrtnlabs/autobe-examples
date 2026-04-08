import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_community_stats_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Test community stats with random community UUID (simulating empty community)
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const stats = await api.functional.redditCommunity.guest.communities.stats.at(
    connection,
    {
      communityId,
    },
  );
  typia.assert(stats);
  // 3. Validate engagement metrics are zero (business logic)
  TestValidator.equals("subscriber count is zero", stats.subscriber_count, 0);
  TestValidator.equals("post count is zero", stats.post_count, 0);
  TestValidator.equals("comment count is zero", stats.comment_count, 0);
  TestValidator.equals("vote count is zero", stats.vote_count, 0);
  // 4. Validate metadata fields are present and valid
  TestValidator.equals("community name exists", stats.name !== "", true);
  TestValidator.equals(
    "created_at is valid datetime format",
    typeof stats.created_at,
    "string",
  );
  // 5. Validate all numeric fields are valid integers >= 0 (type validation)
  TestValidator.predicate(
    "subscriber_count is non-negative integer",
    Number.isInteger(stats.subscriber_count) && stats.subscriber_count >= 0,
  );
  TestValidator.predicate(
    "post_count is non-negative integer",
    Number.isInteger(stats.post_count) && stats.post_count >= 0,
  );
  TestValidator.predicate(
    "comment_count is non-negative integer",
    Number.isInteger(stats.comment_count) && stats.comment_count >= 0,
  );
  TestValidator.predicate(
    "vote_count is non-negative integer",
    Number.isInteger(stats.vote_count) && stats.vote_count >= 0,
  );
}
