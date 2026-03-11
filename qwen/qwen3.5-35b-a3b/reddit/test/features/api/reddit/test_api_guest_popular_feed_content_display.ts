import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestSession";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_popular_feed_content_display(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create guest account for authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const guest: IRedditPlatformGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(guest);
  // Execution: Request popular feed
  const feedResponse: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.guest.posts.feed.popular.index(
      guestConnection,
      {
        body: {
          limit: 20,
          sortBy: "hot",
        },
      },
    );
  typia.assert(feedResponse);
  // Validation: Check response structure
  TestValidator.equals("has pagination", feedResponse.pagination, {
    current: 1,
    limit: 20,
    records: feedResponse.data.length,
    pages: 1,
  });
  // Validation: All posts have required fields
  for (const post of feedResponse.data) {
    TestValidator.predicate(
      "post has title",
      post.title !== undefined && post.title.length > 0,
    );
    TestValidator.predicate(
      "post has valid post_type",
      ["TEXT", "IMAGE", "LINK"].includes(post.post_type),
    );
    TestValidator.predicate(
      "post has vote_score",
      post.vote_score !== undefined,
    );
    TestValidator.predicate(
      "post has comment_count",
      post.comment_count !== undefined,
    );
    TestValidator.predicate("post has author", post.author !== undefined);
    TestValidator.predicate(
      "author has username",
      post.author.username !== undefined,
    );
    TestValidator.predicate("post has community", post.community !== undefined);
    TestValidator.predicate(
      "community has name",
      post.community.name !== undefined,
    );
    TestValidator.predicate(
      "post has created_at",
      post.created_at !== undefined,
    );
  }
  // Validation: Categorize posts by type
  const textPostsInFeed = feedResponse.data.filter(
    (post) => post.post_type === "TEXT",
  );
  const imagePostsInFeed = feedResponse.data.filter(
    (post) => post.post_type === "IMAGE",
  );
  const linkPostsInFeed = feedResponse.data.filter(
    (post) => post.post_type === "LINK",
  );
  // Validation: All post types have common fields
  for (const post of textPostsInFeed) {
    TestValidator.predicate("text post has title", post.title.length > 0);
    TestValidator.predicate("text post has vote_score", post.vote_score !== 0);
  }
  for (const post of imagePostsInFeed) {
    TestValidator.predicate("image post has title", post.title.length > 0);
    TestValidator.predicate("image post has vote_score", post.vote_score !== 0);
  }
  for (const post of linkPostsInFeed) {
    TestValidator.predicate("link post has title", post.title.length > 0);
    TestValidator.predicate("link post has vote_score", post.vote_score !== 0);
  }
}
