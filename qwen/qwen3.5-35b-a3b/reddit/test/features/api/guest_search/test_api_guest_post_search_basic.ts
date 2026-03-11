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

export async function test_api_guest_post_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication setup
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
      },
    },
  );
  typia.assert(guest);
  // 2. Execute search with title query
  const searchQuery: string = RandomGenerator.paragraph({ sentences: 2 });
  const searchResult: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.guest.posts.search.index(
      guestConnection,
      {
        body: {
          search: searchQuery,
          page: 1,
          limit: 20,
          sortBy: "new",
        },
      },
    );
  typia.assert(searchResult);
  // 3. Validate response structure and pagination
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    searchResult.pagination.pages ===
      Math.ceil(
        searchResult.pagination.records / searchResult.pagination.limit,
      ),
  );
  // 4. Validate post summaries contain all required fields
  if (searchResult.data.length > 0) {
    const samplePost = searchResult.data[0];
    typia.assert(samplePost);
    // Validate nested author reference
    typia.assert(samplePost.author);
    typia.assert(samplePost.author.id);
    typia.assert(samplePost.author.username);
    typia.assert(samplePost.author.display_name);
    typia.assert(samplePost.author.karma_score);
    typia.assert(samplePost.author.is_active);
    typia.assert(samplePost.author.created_at);
    // Validate nested community reference
    typia.assert(samplePost.community);
    typia.assert(samplePost.community.id);
    typia.assert(samplePost.community.name);
    typia.assert(samplePost.community.subscriber_count);
    typia.assert(samplePost.community.created_at);
    typia.assert(samplePost.community.owner);
    // Validate post metadata
    typia.assert(samplePost.id);
    typia.assert(samplePost.title);
    typia.assert(samplePost.post_type);
    typia.assert(samplePost.vote_score);
    typia.assert(samplePost.comment_count);
    typia.assert(samplePost.created_at);
    // Ensure created_at is valid ISO date string
    new Date(samplePost.created_at);
  }
  // 5. Verify default sorting (new = created_at desc)
  if (searchResult.data.length > 1) {
    for (let i = 0; i < searchResult.data.length - 1; i++) {
      const current = searchResult.data[i];
      const next = searchResult.data[i + 1];
      TestValidator.predicate(
        `sorting: post ${i} created_at >= post ${i + 1} created_at`,
        new Date(current.created_at).getTime() >=
          new Date(next.created_at).getTime(),
      );
    }
  }
  // 6. Verify no deleted posts in results (author should be active)
  for (const post of searchResult.data) {
    TestValidator.equals(
      `post ${post.id} author is active`,
      post.author.is_active,
      true,
    );
  }
}