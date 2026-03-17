import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";

export async function test_api_community_feed_guest_viewing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for authoring posts
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberAuth);
  // Update member connection with auth token
  memberConnection.headers = { Authorization: memberAuth.token.access };
  // 2. Create a community for testing
  const community = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        icon: null,
      },
    },
  );
  typia.assert(community);
  // 3. Create multiple posts in the community (5-7 posts)
  const postCount = 6;
  const posts: IRedditClonePost[] = [];
  for (let i = 0; i < postCount; i++) {
    const postType = RandomGenerator.pick(["TEXT", "LINK", "IMAGE"] as const);
    const postBody: Partial<IRedditClonePost.ICreate> = {
      title: RandomGenerator.paragraph({ sentences: 1 }),
      post_type: postType,
      community_id: community.id,
    };
    // Add type-specific content
    if (postType === "TEXT") {
      postBody.text = { body: RandomGenerator.content({ paragraphs: 2 }) };
    } else if (postType === "LINK") {
      postBody.link = { url: typia.random<string & tags.Format<"uri">>() };
    } else if (postType === "IMAGE") {
      postBody.image = { fileUri: typia.random<string & tags.Format<"uri">>() };
    }
    const post = await generate_random_reddit_clone_member_posts_create(
      memberConnection,
      { body: postBody },
    );
    typia.assert(post);
    posts.push(post);
    // Small delay to ensure different created_at timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  // 4. Fetch community feed as GUEST (no authentication - use base connection)
  const guestConnection: api.IConnection = { host: connection.host };
  const feedResponse = await api.functional.redditClone.communities.feed.index(
    guestConnection,
    {
      communityId: community.id,
      body: {
        page: 1,
        limit: 20,
        sort: "hot",
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(feedResponse);
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    feedResponse.pagination !== undefined,
  );
  TestValidator.equals("current page", feedResponse.pagination.current, 1);
  TestValidator.equals("limit", feedResponse.pagination.limit, 20);
  TestValidator.equals(
    "total records",
    feedResponse.pagination.records,
    postCount,
  );
  TestValidator.predicate(
    "total pages calculated",
    feedResponse.pagination.pages >= 1,
  );
  // 6. Validate posts array exists and has correct count
  TestValidator.predicate(
    "posts array exists",
    Array.isArray(feedResponse.data),
  );
  TestValidator.equals(
    "post count matches",
    feedResponse.data.length,
    postCount,
  );
  // 7. Validate each post has all required fields
  for (const postSummary of feedResponse.data) {
    // Required fields validation
    TestValidator.predicate("post id exists", postSummary.id !== undefined);
    TestValidator.predicate(
      "post id is uuid",
      /^[0-9a-f-]{36}$/i.test(postSummary.id),
    );
    TestValidator.predicate("title exists", postSummary.title !== undefined);
    TestValidator.predicate("title is non-empty", postSummary.title.length > 0);
    TestValidator.predicate(
      "post_type exists",
      postSummary.post_type !== undefined,
    );
    TestValidator.predicate(
      "post_type is valid enum",
      postSummary.post_type === "TEXT" ||
        postSummary.post_type === "LINK" ||
        postSummary.post_type === "IMAGE",
    );
    // Author information
    TestValidator.predicate("author exists", postSummary.author !== undefined);
    TestValidator.predicate(
      "author id exists",
      postSummary.author.id !== undefined,
    );
    TestValidator.predicate(
      "author username exists",
      postSummary.author.username !== undefined,
    );
    TestValidator.predicate(
      "author display_name exists",
      postSummary.author.display_name !== undefined,
    );
    // Community information
    TestValidator.predicate(
      "community exists",
      postSummary.community !== undefined,
    );
    TestValidator.predicate(
      "community id exists",
      postSummary.community.id !== undefined,
    );
    TestValidator.predicate(
      "community name exists",
      postSummary.community.name !== undefined,
    );
    TestValidator.equals(
      "community matches",
      postSummary.community.id,
      community.id,
    );
    // Engagement metrics
    TestValidator.predicate(
      "vote_score is number",
      typeof postSummary.vote_score === "number",
    );
    TestValidator.predicate(
      "comment_count is number",
      typeof postSummary.comment_count === "number",
    );
    // Timestamps
    TestValidator.predicate(
      "created_at exists",
      postSummary.created_at !== undefined,
    );
    TestValidator.predicate(
      "created_at is valid date",
      !isNaN(Date.parse(postSummary.created_at)),
    );
    // Preview content
    TestValidator.predicate(
      "preview exists",
      postSummary.preview !== undefined,
    );
    TestValidator.predicate(
      "preview is string",
      typeof postSummary.preview === "string",
    );
  }
  // 8. Verify posts are from the created community (all should match)
  const allPostsFromCommunity = feedResponse.data.every(
    (post) => post.community.id === community.id,
  );
  TestValidator.predicate(
    "all posts from test community",
    allPostsFromCommunity,
  );
  // 9. Verify author is the member who created posts
  const allPostsByMember = feedResponse.data.every(
    (post) => post.author.id === memberAuth.id,
  );
  TestValidator.predicate("all posts by test member", allPostsByMember);
  // 10. Test with different pagination parameters
  const paginatedFeed = await api.functional.redditClone.communities.feed.index(
    guestConnection,
    {
      communityId: community.id,
      body: {
        page: 1,
        limit: 3,
        sort: "new",
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(paginatedFeed);
  TestValidator.equals("paginated limit", paginatedFeed.pagination.limit, 3);
  TestValidator.predicate(
    "paginated count respects limit",
    paginatedFeed.data.length <= 3,
  );
  TestValidator.equals(
    "paginated records total",
    paginatedFeed.pagination.records,
    postCount,
  );
  // 11. Verify posts are returned in expected order for 'new' sort (most recent first)
  if (paginatedFeed.data.length >= 2) {
    const firstPostDate = new Date(paginatedFeed.data[0].created_at).getTime();
    const secondPostDate = new Date(paginatedFeed.data[1].created_at).getTime();
    TestValidator.predicate(
      "new sort returns most recent first",
      firstPostDate >= secondPostDate,
    );
  }
}
