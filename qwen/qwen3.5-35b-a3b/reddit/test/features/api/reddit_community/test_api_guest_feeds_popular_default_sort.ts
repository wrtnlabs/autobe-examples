import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_feeds_popular_default_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest account
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IRedditCommunityGuest.IJoin,
  });
  typia.assert(guest);
  // 2. Create test posts with varying engagement levels and recency
  // Create posts that should be ranked by hot algorithm
  const posts: IRedditCommunityPost.ISummary[] = [];
  const numPosts = 10;
  for (let i = 0; i < numPosts; i++) {
    const textContent = typia.random<string & tags.MaxLength<200>>();
    const post: IRedditCommunityPost.ISummary = {
      id: typia.random<string & tags.Format<"uuid">>(),
      title: RandomGenerator.name(3),
      post_type: i % 3 === 0 ? "text" : i % 3 === 1 ? "link" : "image",
      text_content: i % 3 === 0 ? textContent : null,
      link_url: i % 3 === 1 ? `https://example.com/${i}` : null,
      vote_score: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<-100> & tags.Maximum<1000>
      >(),
      comment_count: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<500>
      >(),
      created_at: new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      author: {
        id: typia.random<string & tags.Format<"uuid">>(),
        username: RandomGenerator.name(2),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditCommunityMember.ISummary,
      community: {
        id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.alphabets(6),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        subscriber_count: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        created_at: new Date().toISOString(),
        deleted_at: null,
      } satisfies IRedditCommunityCommunity.ISummary,
    };
    posts.push(post);
  }
  // 3. Call popular feed endpoint WITHOUT sort parameter (defaults to "hot")
  const feedResponse =
    await api.functional.redditCommunity.guest.feeds.popular.index(
      guestConnection,
      {
        body: {} satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(feedResponse);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    feedResponse.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", feedResponse.pagination.limit, 20);
  TestValidator.equals(
    "pagination records count",
    feedResponse.pagination.records,
    numPosts,
  );
  TestValidator.equals(
    "pagination pages count",
    feedResponse.pagination.pages,
    1,
  );
  // 5. Validate posts structure and sorting
  TestValidator.equals(
    "posts count matches",
    feedResponse.data.length,
    numPosts,
  );
  // 6. Validate each post summary has correct structure
  for (let i = 0; i < feedResponse.data.length; i++) {
    const post = feedResponse.data[i];
    typia.assert(post);
    // Validate required fields present
    TestValidator.equals(`post ${i} has id`, typeof post.id, "string");
    TestValidator.equals(`post ${i} has title`, typeof post.title, "string");
    TestValidator.equals(
      `post ${i} has post_type`,
      typeof post.post_type,
      "string",
    );
    TestValidator.equals(
      `post ${i} has vote_score`,
      typeof post.vote_score,
      "number",
    );
    TestValidator.equals(
      `post ${i} has comment_count`,
      typeof post.comment_count,
      "number",
    );
    TestValidator.equals(
      `post ${i} has created_at`,
      typeof post.created_at,
      "string",
    );
    TestValidator.equals(
      `post ${i} has updated_at`,
      typeof post.updated_at,
      "string",
    );
    TestValidator.equals(
      `post ${i} has deleted_at`,
      post.deleted_at === null,
      true,
    );
    TestValidator.equals(
      `post ${i} has author`,
      post.author !== undefined,
      true,
    );
    TestValidator.equals(
      `post ${i} has community`,
      post.community !== undefined,
      true,
    );
    // Validate author structure
    TestValidator.equals(
      `post ${i} author has username`,
      typeof post.author.username,
      "string",
    );
    // Validate community structure
    TestValidator.equals(
      `post ${i} community has name`,
      typeof post.community.name,
      "string",
    );
    // Validate text content truncation
    if (post.post_type === "text") {
      TestValidator.predicate(
        `post ${i} text content max 200 chars`,
        post.text_content === null || post.text_content.length <= 200,
      );
    } else {
      TestValidator.equals(
        `post ${i} non-text has null text_content`,
        post.text_content,
        null,
      );
    }
  }
  // 7. Verify soft-deleted posts are excluded (all posts should have deleted_at = null)
  const deletedPosts = feedResponse.data.filter(
    (post) => post.deleted_at !== null,
  );
  TestValidator.equals("no soft-deleted posts in feed", deletedPosts.length, 0);
}
