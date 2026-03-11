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

export async function test_api_guest_popular_feed_controversial_sort(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create guest account using utility function
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(guestAuth);
  // Step 2: Fetch popular feed with controversial sort
  const popularFeed =
    await api.functional.redditPlatform.guest.posts.feed.popular.index(
      guestConnection,
      {
        body: {
          sortBy: "controversial",
        },
      },
    );
  typia.assert(popularFeed);
  const { pagination, data } = popularFeed;
  // Step 3: Verify pagination metadata
  TestValidator.predicate("pagination exists", pagination !== undefined);
  TestValidator.equals("current page is 1", pagination.current, 1);
  TestValidator.equals("default limit is 20", pagination.limit, 20);
  TestValidator.predicate("has records count", pagination.records >= 0);
  TestValidator.predicate("has pages count", pagination.pages >= 0);
  // Step 4: Validate posts structure and content
  if (data.length > 0) {
    const firstPost = data[0];
    typia.assert(firstPost);
    // Validate post has required fields with meaningful values
    TestValidator.predicate("post has valid id", firstPost.id !== undefined);
    TestValidator.predicate("post has title", firstPost.title.length > 0);
    TestValidator.equals(
      "post has valid type",
      firstPost.post_type === "TEXT" ||
        firstPost.post_type === "LINK" ||
        firstPost.post_type === "IMAGE",
      true,
    );
    TestValidator.predicate(
      "post has vote score",
      firstPost.vote_score !== undefined,
    );
    TestValidator.predicate(
      "post has comment count",
      firstPost.comment_count !== undefined,
    );
    TestValidator.predicate(
      "post has created_at",
      firstPost.created_at !== undefined,
    );
    // Validate author structure
    typia.assert(firstPost.author);
    TestValidator.predicate(
      "author has valid id",
      firstPost.author.id !== undefined,
    );
    TestValidator.predicate(
      "author has username",
      firstPost.author.username.length > 0,
    );
    TestValidator.predicate(
      "author has display_name",
      firstPost.author.display_name.length > 0,
    );
    TestValidator.predicate(
      "author has karma",
      firstPost.author.karma_score !== undefined,
    );
    TestValidator.equals(
      "author has active status",
      typeof firstPost.author.is_active === "boolean",
      true,
    );
    // Validate community structure
    typia.assert(firstPost.community);
    TestValidator.predicate(
      "community has valid id",
      firstPost.community.id !== undefined,
    );
    TestValidator.predicate(
      "community has name",
      firstPost.community.name.length > 0,
    );
    TestValidator.predicate(
      "community has subscriber_count",
      firstPost.community.subscriber_count !== undefined,
    );
    TestValidator.predicate(
      "community has created_at",
      firstPost.community.created_at !== undefined,
    );
    typia.assert(firstPost.community.owner);
    TestValidator.predicate(
      "community owner has id",
      firstPost.community.owner.id !== undefined,
    );
    TestValidator.predicate(
      "community owner has username",
      firstPost.community.owner.username.length > 0,
    );
    // Step 5: For controversial posts, vote_score should be near zero
    // (high engagement from opposing viewpoints = polarizing content)
    if (firstPost.vote_score !== undefined) {
      TestValidator.predicate(
        "controversial post has manageable score",
        Math.abs(firstPost.vote_score) < 1000,
      );
    }
  }
  // Step 6: Fetch page 2 with limit=50
  const pageTwoFeed =
    await api.functional.redditPlatform.guest.posts.feed.popular.index(
      guestConnection,
      {
        body: {
          sortBy: "controversial",
          page: 2,
          limit: 50,
        },
      },
    );
  typia.assert(pageTwoFeed);
  // Step 7: Verify pagination changed
  TestValidator.equals("page 2 request", pageTwoFeed.pagination.current, 2);
  TestValidator.equals("limit 50", pageTwoFeed.pagination.limit, 50);
  // Step 8: Verify records count stays consistent
  TestValidator.equals(
    "records consistent",
    pageTwoFeed.pagination.records,
    pagination.records,
  );
  // Step 9: Verify pages calculated correctly
  const expectedPages = Math.ceil(pagination.records / 50);
  TestValidator.equals(
    "pages calculated",
    pageTwoFeed.pagination.pages,
    expectedPages,
  );
  // Step 10: Validate data count for page 2 (should be up to 50)
  TestValidator.predicate(
    "page 2 has appropriate data count",
    pageTwoFeed.data.length <= 50,
  );
  // Step 11: If data exists, validate structure matches
  if (pageTwoFeed.data.length > 0) {
    const firstPageTwoPost = pageTwoFeed.data[0];
    typia.assert(firstPageTwoPost);
    TestValidator.predicate("post has id", firstPageTwoPost.id !== undefined);
    TestValidator.predicate(
      "post has title",
      firstPageTwoPost.title.length > 0,
    );
  }
}
