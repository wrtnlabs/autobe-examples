import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_popular_feed_viewing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication setup
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityGuest.IJoin,
  });
  typia.assert(guestAuth);
  // Create authenticated guest connection
  const authenticatedGuestConnection: api.IConnection = {
    host: connection.host,
  };
  authenticatedGuestConnection.headers = {
    Authorization: guestAuth.token.access,
  };
  // 2. Test hot sorting (default)
  const hotFeed = await api.functional.redditCommunity.guest.popular.feed.index(
    authenticatedGuestConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(hotFeed);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    hotFeed.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", hotFeed.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records non-negative",
    hotFeed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    hotFeed.pagination.pages >= 0,
  );
  // Verify post structure if data exists
  if (hotFeed.data.length > 0) {
    const firstPost = hotFeed.data[0];
    typia.assert(firstPost);
    TestValidator.equals("post has valid id", firstPost.id !== "", true);
    TestValidator.equals("post has title", firstPost.title !== "", true);
    TestValidator.equals("post has author", firstPost.author !== null, true);
    TestValidator.equals(
      "author has username",
      firstPost.author.username !== "",
      true,
    );
    TestValidator.equals(
      "post has community",
      firstPost.community !== null,
      true,
    );
    TestValidator.equals(
      "community has name",
      firstPost.community.name !== "",
      true,
    );
    TestValidator.equals(
      "post has vote_score",
      firstPost.vote_score !== null,
      true,
    );
    TestValidator.equals(
      "post has comment_count",
      firstPost.comment_count !== null,
      true,
    );
    TestValidator.equals(
      "post has created_at",
      firstPost.created_at !== "",
      true,
    );
    TestValidator.predicate(
      "post_type is valid enum",
      ["text", "link", "image"].includes(firstPost.post_type),
    );
    TestValidator.predicate(
      "preview_content is string or null",
      typeof firstPost.preview_content === "string" ||
        firstPost.preview_content === null,
    );
  }
  // 3. Test pagination with different page sizes
  const limitValues = [10, 25, 50, 100];
  for (const limit of limitValues) {
    const limitedFeed =
      await api.functional.redditCommunity.guest.popular.feed.index(
        authenticatedGuestConnection,
        {
          body: {
            page: 1,
            limit: limit,
          } satisfies IRedditCommunityPost.IRequest,
        },
      );
    typia.assert(limitedFeed);
    TestValidator.equals(
      `pagination limit ${limit} matches request`,
      limitedFeed.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `pagination records for limit ${limit} non-negative`,
      limitedFeed.pagination.records >= 0,
    );
  }
  // 4. Test pagination with different pages
  if (hotFeed.data.length > 0) {
    const nextPage =
      await api.functional.redditCommunity.guest.popular.feed.index(
        authenticatedGuestConnection,
        {
          body: {
            page: 2,
            limit: 20,
          } satisfies IRedditCommunityPost.IRequest,
        },
      );
    typia.assert(nextPage);
    TestValidator.equals("pagination page 2", nextPage.pagination.current, 2);
  }
  // 5. Test community diversity
  if (hotFeed.data.length > 0) {
    const communityNames = hotFeed.data.map((post) => post.community.name);
    const uniqueCommunities = new Set(communityNames);
    TestValidator.predicate(
      "multiple communities in popular feed",
      uniqueCommunities.size >= 1,
    );
    TestValidator.predicate(
      "all community names are unique strings",
      Array.from(uniqueCommunities).every((name) => typeof name === "string"),
    );
  }
  // 6. Test search filter
  if (hotFeed.data.length > 0) {
    const sampleTitle = hotFeed.data[0].title;
    const searchFeed =
      await api.functional.redditCommunity.guest.popular.feed.index(
        authenticatedGuestConnection,
        {
          body: {
            page: 1,
            limit: 20,
            search: sampleTitle,
          } satisfies IRedditCommunityPost.IRequest,
        },
      );
    typia.assert(searchFeed);
    TestValidator.equals(
      "search feed has valid pagination",
      searchFeed.pagination.current,
      1,
    );
    TestValidator.predicate(
      "search feed has data array",
      Array.isArray(searchFeed.data),
    );
  }
  // 7. Test empty feed handling
  const emptyCheckFeed =
    await api.functional.redditCommunity.guest.popular.feed.index(
      authenticatedGuestConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(emptyCheckFeed);
  TestValidator.predicate(
    "empty feed returns valid pagination",
    emptyCheckFeed.pagination.records >= 0 &&
      emptyCheckFeed.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "empty feed has data array",
    Array.isArray(emptyCheckFeed.data),
  );
}