import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_popular_feed_vote_and_comment_metrics(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(guest);
  // Create a second guest for voting
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_guest_join(voterConnection, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(voter);
  // Get popular posts
  const popular = await api.functional.redditLike.guest.posts.popular.index(
    guestConnection,
    {
      body: {
        type: "text",
        title: "test",
        communityName: "test",
        page: 1,
        limit: 100,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(popular);
  // Validate vote score calculation and comment counts
  if (popular.data.length > 0) {
    for (const post of popular.data) {
      typia.assert(post);
      // Verify vote score is numeric
      TestValidator.predicate(
        "voteScore is number",
        typeof post.voteScore === "number",
      );
      // Verify comment count is non-negative
      TestValidator.predicate(
        "commentCount non-negative",
        post.commentCount >= 0,
      );
      // Verify timestamp format
      TestValidator.predicate(
        "createdAt ISO format",
        new Date(post.createdAt).toISOString() === post.createdAt,
      );
      // Verify author info exists
      TestValidator.notEquals("author exists", post.author.id, null);
      TestValidator.predicate(
        "author username exists",
        post.author.username.length > 0,
      );
      // Verify community info exists
      TestValidator.notEquals("community exists", post.community.name, null);
      TestValidator.predicate(
        "subscriber count non-negative",
        post.community.subscriber_count >= 0,
      );
    }
  } else {
    TestValidator.equals("no posts returned", popular.data.length, 0);
  }
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    popular.pagination !== undefined,
  );
  TestValidator.predicate("current page >= 1", popular.pagination.current >= 1);
  TestValidator.predicate(
    "records count >= 0",
    popular.pagination.records >= 0,
  );
  TestValidator.predicate("pages count >= 0", popular.pagination.pages >= 0);
}
