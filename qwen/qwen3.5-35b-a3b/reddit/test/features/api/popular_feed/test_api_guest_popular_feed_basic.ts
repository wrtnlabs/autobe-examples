import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPopularFeedRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPopularFeedRequest";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_popular_feed_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const guestSession = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformGuest.IJoin,
  });
  typia.assert(guestSession);
  // 2. Request popular feed with default parameters
  const feed = await api.functional.redditPlatform.guest.feeds.popular.index(
    guestConnection,
    {
      body: {
        sort: "hot",
        page: 1,
        limit: 20,
      } satisfies IRedditPlatformPopularFeedRequest,
    },
  );
  typia.assert(feed);
  // 3. Validate pagination structure
  TestValidator.equals("pagination current page", feed.pagination.current, 1);
  TestValidator.equals("pagination limit", feed.pagination.limit, 20);
  TestValidator.equals(
    "pagination records non-negative",
    feed.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    feed.pagination.pages,
    Math.ceil(feed.pagination.records / feed.pagination.limit),
  );
  // 4. Validate posts array structure and nested relationships
  const posts = feed.data;
  typia.assert(posts);
  // 5. Validate each post has required fields and proper relationships
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    typia.assert(post);
    // Validate post type is one of the allowed values
    TestValidator.equals(
      `post ${i} post type valid`,
      post.post_type === "text" ||
        post.post_type === "link" ||
        post.post_type === "image",
      true,
    );
    // Validate deleted_at is null (soft-deleted posts excluded)
    TestValidator.equals(`post ${i} not deleted`, post.deleted_at, null);
    // Validate author relationship is properly joined
    typia.assert(post.author);
    TestValidator.equals(
      `post ${i} author id valid`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        post.author.id,
      ),
      true,
    );
    TestValidator.equals(
      `post ${i} author has username`,
      post.author.username.length > 0,
      true,
    );
    // Validate community relationship is properly joined
    typia.assert(post.community);
    TestValidator.equals(
      `post ${i} community id valid`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        post.community.id,
      ),
      true,
    );
    TestValidator.equals(
      `post ${i} community has name`,
      post.community.name.length > 0,
      true,
    );
    // Validate community owner is joined
    typia.assert(post.community.owner);
    TestValidator.equals(
      `post ${i} community owner id valid`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        post.community.owner.id,
      ),
      true,
    );
    // 6. Validate vote scores are non-negative (business rule)
    TestValidator.predicate(
      `post ${i} upvotes non-negative`,
      post.upvotes_count >= 0,
    );
    TestValidator.predicate(
      `post ${i} downvotes non-negative`,
      post.downvotes_count >= 0,
    );
    TestValidator.predicate(
      `post ${i} comment count non-negative`,
      post.comment_count >= 0,
    );
  }
  // 7. Validate pagination hasNext logic (should be true if there are more pages)
  const hasNext = feed.pagination.current < feed.pagination.pages;
  TestValidator.equals(
    "pagination hasNext correct",
    feed.pagination.pages > 0 &&
      feed.pagination.current < feed.pagination.pages,
    hasNext,
  );
}
