import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";

/**
 * Test complete workflow of member casting a downvote on a post.
 *
 * This test validates the voting system's negative quality signal mechanism by
 * simulating a realistic scenario where one member downvotes another member's
 * post.
 *
 * Workflow steps:
 *
 * 1. First member registration as post author
 * 2. Community creation by first member
 * 3. Post creation by first member in the community
 * 4. Second member registration as voter
 * 5. Second member casts downvote (-1) on first member's post
 * 6. Validation of downvote record with correct vote_value
 */
export async function test_api_member_post_downvote_creation(
  connection: api.IConnection,
) {
  // Step 1: Register first member (post author)
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMemberData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: firstMemberEmail,
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const firstMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: firstMemberData,
    });
  typia.assert(firstMember);

  // Step 2: Create community by first member
  const communityData = {
    code: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<25> &
        tags.Pattern<"^[a-zA-Z0-9_]+$">
    >(),
    name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
    description: typia.random<
      string & tags.MinLength<10> & tags.MaxLength<500>
    >(),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    primary_category: "technology",
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create post by first member
  const postData = {
    community_id: community.id,
    type: "text",
    title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
    body: typia.random<string & tags.MaxLength<40000>>(),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Register second member (voter)
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMemberData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: secondMemberEmail,
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const secondMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: secondMemberData,
    });
  typia.assert(secondMember);

  // Step 5: Cast downvote by second member
  const downvoteData = {
    vote_value: -1,
  } satisfies IRedditLikePostVote.ICreate;

  const vote: IRedditLikePostVote =
    await api.functional.redditLike.member.posts.votes.create(connection, {
      postId: post.id,
      body: downvoteData,
    });
  typia.assert(vote);

  // Step 6: Validate downvote business logic
  TestValidator.equals("downvote value should be -1", vote.vote_value, -1);
}
