import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

/**
 * Prepare a realistic data set for controversial post feed testing.
 *
 * Original requirement: validate pagination and timeRange behavior for GET
 * /communityPlatform/feeds/posts/controversial. However, no SDK function exists
 * for this endpoint in the provided client, so we cannot directly call the
 * feed. Instead, this test focuses on:
 *
 * 1. Fully exercising the data-creation path that any controversial-feed
 *    implementation would depend on:
 *
 *    - Member user join and authentication
 *    - Community creation
 *    - Bulk post creation within that community
 *    - Diverse voting patterns over those posts
 * 2. Verifying via typia.assert that all created entities match their DTO
 *    contracts, and via TestValidator that high-level invariants hold.
 * 3. Documenting, in comments, how pagination and timeRange verifications would be
 *    layered on top of this data set once the controversial-feed endpoint is
 *    exposed in the SDK.
 *
 * Step-by-step behavior in this test:
 *
 * 1. Join a new member user using api.functional.auth.memberUser.join, ensuring an
 *    authenticated context for subsequent calls.
 * 2. Create a single community via
 *    api.functional.communityPlatform.memberUser.communities.create.
 * 3. Create a batch of posts (e.g., 25) in that community using
 *    api.functional.communityPlatform.memberUser.posts.create, mixing textual
 *    and link-style posts where supported by ICommunityPlatformPost.ICreate.
 * 4. For a subset of posts, cast votes using
 *    api.functional.communityPlatform.memberUser.posts.votes.create with
 *    different directions (e.g., "up" and "down") to simulate controversial
 *    patterns (similar total votes but with high disagreement).
 * 5. Assert that:
 *
 *    - The number of created posts equals the requested batch size.
 *    - Every post has community_id matching the created community.
 *    - Vote records returned from the votes.create endpoint have post_id equal to
 *         the voted post and a direction exactly equal to the requested value.
 * 6. Comment at the end how, if a
 *    api.functional.communityPlatform.feeds.posts.controversial.index (or
 *    similar) function existed returning IPageICommunityPlatformPost.ISummary,
 *    we would:
 *
 *    - Call it with page/pageSize and timeRange combinations.
 *    - Validate that pagination.current/limit/records/pages make sense.
 *    - Confirm that posts with strong, recent controversy appear in earlier pages
 *         for narrow time ranges and that older-but-highly- controversial posts
 *         surface when timeRange=all.
 */
export async function test_api_controversial_posts_feed_pagination_and_time_range(
  connection: api.IConnection,
) {
  // 1. Join as a member user to obtain an authenticated context.
  const joinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(10)}@example.com`,
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a community owned by this member user.
  const communityBody = {
    slug: RandomGenerator.alphabets(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Create a batch of posts in this community.
  const postCount = 25;
  const posts: ICommunityPlatformPost[] = [];

  for (let i = 0; i < postCount; i++) {
    const postBody = {
      communityId: community.id,
      communityCode: community.slug,
      title: RandomGenerator.paragraph({ sentences: 2 }),
      body: RandomGenerator.paragraph({ sentences: 8 }),
      url:
        i % 3 === 0
          ? "https://news.example.com/articles/" +
            RandomGenerator.alphaNumeric(8)
          : undefined,
      postType: i % 3 === 0 ? "link" : "text",
    } satisfies ICommunityPlatformPost.ICreate;

    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        { body: postBody },
      );
    typia.assert(post);
    posts.push(post);
  }

  // Validate that the expected number of posts were created.
  TestValidator.equals(
    "created posts count matches configured batch size",
    posts.length,
    postCount,
  );

  // Validate that all posts belong to the created community.
  for (const post of posts) {
    TestValidator.equals(
      "post.community_id matches created community.id",
      post.community_id,
      community.id,
    );
  }

  // 4. Cast diverse votes over a subset of posts to simulate controversy.
  // Strategy:
  // - For the first 10 posts, alternate up/down per index to create
  //   disagreement across posts.
  // - For the next 10 posts, favor upvotes more heavily.
  // - Leave the remaining posts without votes.
  const votedPosts = posts.slice(0, 20);
  const recordedVotes: ICommunityPlatformPostVote[] = [];

  for (let index = 0; index < votedPosts.length; index++) {
    const targetPost = votedPosts[index];

    // Decide vote directions for this post.
    const directions: string[] = [];
    if (index < 10) {
      // Highly controversial: equal up and down.
      directions.push("up", "down", "up", "down");
    } else {
      // More consensus: mostly up.
      directions.push("up", "up", "up");
      if (index % 2 === 0) directions.push("down");
    }

    for (const direction of directions) {
      const voteBody = {
        direction,
      } satisfies ICommunityPlatformPostVote.ICreate;

      const vote: ICommunityPlatformPostVote =
        await api.functional.communityPlatform.memberUser.posts.votes.create(
          connection,
          {
            postId: targetPost.id,
            body: voteBody,
          },
        );
      typia.assert(vote);
      recordedVotes.push(vote);

      // Ensure vote is tied to the right post and direction is preserved.
      TestValidator.equals(
        "vote.post_id equals target post id",
        vote.post_id,
        targetPost.id,
      );
      TestValidator.equals(
        "vote.direction equals requested direction",
        vote.direction,
        direction,
      );
    }
  }

  TestValidator.predicate(
    "at least one vote has been recorded for controversial scenario",
    () => recordedVotes.length > 0,
  );

  // 5. Conceptual notes for controversial feed testing (non-executable):
  //
  // If a feed endpoint such as
  // api.functional.communityPlatform.feeds.posts.controversial.index
  // existed and returned IPageICommunityPlatformPost.ISummary, the
  // following additional validations would be layered on top of this
  // data set:
  //
  // - Call the feed with page=0, pageSize=10, timeRange="week" and
  //   verify:
  //   * pagination.current === 0 and pagination.limit === 10.
  //   * data.length <= 10.
  //   * Posts with many recent opposing votes (those in the first
  //     10 of votedPosts) appear earlier in the list.
  // - Call the feed with page=1 and ensure no overlap with page=0
  //   results by comparing post IDs and verifying the union of
  //   IDs across pages respects the total records count.
  // - Call the feed with timeRange="day" and assert that very old
  //   posts (if we had created some with older timestamps) are
  //   either absent or appear lower in rank compared to those
  //   created recently.
  // - Call the feed with timeRange="all" and ensure historically
  //   controversial posts can surface high even if they’re
  //   older, as long as engagement volume is high.
  // - For invalid pagination or timeRange values, use
  //   TestValidator.error to ensure that the API rejects the
  //   request according to its error semantics.
}
