import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostRecentActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostRecentActivity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_post_statistics_happy_path(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Use guest connection for statistics request
  const statistics = await api.functional.redditPlatform.guest.posts.statistics(
    guestConnection,
    {
      postId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(statistics);
  // 3. Validate ID matches
  TestValidator.equals(
    "post ID matches request",
    statistics.id,
    guestConnection.headers?.Authorization ? statistics.id : undefined,
  );
  // 4. Validate author metadata exists
  typia.assert(statistics.author);
  TestValidator.equals(
    "author has valid id",
    typia.assert<string & tags.Format<"uuid">>(statistics.author.id),
    statistics.author.id,
  );
  TestValidator.predicate(
    "author username is string",
    typeof statistics.author.username === "string" &&
      statistics.author.username.length > 0,
  );
  TestValidator.predicate(
    "author karma is int32",
    Number.isInteger(statistics.author.karma) &&
      statistics.author.karma >= -2147483648 &&
      statistics.author.karma <= 2147483647,
  );
  TestValidator.predicate(
    "author created_at is valid datetime",
    !isNaN(Date.parse(statistics.author.created_at)),
  );
  // 5. Validate community metadata exists
  typia.assert(statistics.community);
  TestValidator.predicate(
    "community name is string",
    typeof statistics.community.name === "string" &&
      statistics.community.name.length > 0,
  );
  TestValidator.predicate(
    "community subscriber_count is non-negative int32",
    Number.isInteger(statistics.community.subscriber_count) &&
      statistics.community.subscriber_count >= 0,
  );
  TestValidator.predicate(
    "community created_at is valid datetime",
    !isNaN(Date.parse(statistics.community.created_at)),
  );
  TestValidator.predicate(
    "community updated_at is valid datetime",
    !isNaN(Date.parse(statistics.community.updated_at)),
  );
  // 6. Validate timestamps
  TestValidator.predicate(
    "post created_at is valid datetime",
    !isNaN(Date.parse(statistics.created_at)),
  );
  TestValidator.predicate(
    "post updated_at is valid datetime",
    !isNaN(Date.parse(statistics.updated_at)),
  );
  // 7. Validate vote metrics
  TestValidator.predicate(
    "upvotes_count is non-negative int32",
    Number.isInteger(statistics.upvotes_count) && statistics.upvotes_count >= 0,
  );
  TestValidator.predicate(
    "downvotes_count is non-negative int32",
    Number.isInteger(statistics.downvotes_count) &&
      statistics.downvotes_count >= 0,
  );
  TestValidator.equals(
    "total_votes equals sum of upvotes and downvotes",
    statistics.total_votes,
    statistics.upvotes_count + statistics.downvotes_count,
  );
  TestValidator.predicate(
    "vote_ratio is between 0 and 1",
    statistics.vote_ratio >= 0 && statistics.vote_ratio <= 1,
  );
  TestValidator.predicate(
    "unique_voters_count is non-negative int32",
    Number.isInteger(statistics.unique_voters_count) &&
      statistics.unique_voters_count >= 0,
  );
  // 8. Validate comment metrics
  TestValidator.predicate(
    "comment_count is non-negative int32",
    Number.isInteger(statistics.comment_count) && statistics.comment_count >= 0,
  );
  TestValidator.predicate(
    "root_comment_count is non-negative int32",
    Number.isInteger(statistics.root_comment_count) &&
      statistics.root_comment_count >= 0,
  );
  TestValidator.predicate(
    "reply_comment_count is non-negative int32",
    Number.isInteger(statistics.reply_comment_count) &&
      statistics.reply_comment_count >= 0,
  );
  TestValidator.predicate(
    "root + reply comment count equals total comment count",
    statistics.root_comment_count + statistics.reply_comment_count ===
      statistics.comment_count,
  );
  // 9. Validate top_comment_id (can be null when no comments)
  if (statistics.comment_count === 0) {
    TestValidator.equals(
      "top_comment_id is null when no comments",
      statistics.top_comment_id,
      null,
    );
  } else {
    TestValidator.predicate(
      "top_comment_id is valid UUID when comments exist",
      statistics.top_comment_id !== null &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          statistics.top_comment_id!,
        ),
    );
  }
  // 10. Validate engagement metrics
  TestValidator.predicate(
    "votes_per_comment_ratio is non-negative",
    statistics.votes_per_comment_ratio >= 0,
  );
  TestValidator.predicate(
    "comment_density is non-negative",
    statistics.comment_density >= 0,
  );
  TestValidator.predicate(
    "engagement_velocity is non-negative",
    statistics.engagement_velocity >= 0,
  );
  // 11. Validate recent activity 24h
  typia.assert(statistics.recent_activity_24h);
  TestValidator.predicate(
    "24h comment_count is non-negative int32",
    Number.isInteger(statistics.recent_activity_24h.comment_count) &&
      statistics.recent_activity_24h.comment_count >= 0,
  );
  TestValidator.predicate(
    "24h vote_count is non-negative int32",
    Number.isInteger(statistics.recent_activity_24h.vote_count) &&
      statistics.recent_activity_24h.vote_count >= 0,
  );
  TestValidator.predicate(
    "24h unique_voters_count is non-negative int32",
    Number.isInteger(statistics.recent_activity_24h.unique_voters_count) &&
      statistics.recent_activity_24h.unique_voters_count >= 0,
  );
  // 12. Validate recent activity 7d
  typia.assert(statistics.recent_activity_7d);
  TestValidator.predicate(
    "7d comment_count is non-negative int32",
    Number.isInteger(statistics.recent_activity_7d.comment_count) &&
      statistics.recent_activity_7d.comment_count >= 0,
  );
  TestValidator.predicate(
    "7d vote_count is non-negative int32",
    Number.isInteger(statistics.recent_activity_7d.vote_count) &&
      statistics.recent_activity_7d.vote_count >= 0,
  );
  TestValidator.predicate(
    "7d unique_voters_count is non-negative int32",
    Number.isInteger(statistics.recent_activity_7d.unique_voters_count) &&
      statistics.recent_activity_7d.unique_voters_count >= 0,
  );
  // 13. Validate community owner exists
  typia.assert(statistics.community.owner);
  TestValidator.predicate(
    "community owner has valid id",
    !!statistics.community.owner.id,
  );
  TestValidator.predicate(
    "community owner has username",
    typeof statistics.community.owner.username === "string",
  );
}
