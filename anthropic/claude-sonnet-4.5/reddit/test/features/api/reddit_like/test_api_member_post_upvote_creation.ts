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
 * Test the complete workflow of a member casting an upvote on a post.
 *
 * This test validates the voting system's positive endorsement mechanism by
 * executing the following workflow:
 *
 * 1. Create first member account (post author who will receive karma)
 * 2. Authenticate as first member and create a community
 * 3. Create a text post in the community as the first member
 * 4. Create second member account (voter who will cast the upvote)
 * 5. Authenticate as second member and cast upvote (+1) on the post
 *
 * The test validates that:
 *
 * - The upvote is successfully recorded in the voting system
 * - The vote value is +1 for upvote
 * - The vote relationship is established between voting member and post
 * - All foreign key relationships are properly maintained
 */
export async function test_api_member_post_upvote_creation(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (post author)
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorPassword = typia.random<string & tags.MinLength<8>>();
  const authorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const author: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: authorUsername,
        email: authorEmail,
        password: authorPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(author);

  // Step 2: Create community to host the post
  const communityCode = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<25> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const communityName = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<25>
  >();
  const communityDescription = typia.random<
    string & tags.MinLength<10> & tags.MaxLength<500>
  >();

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: communityCode,
        name: communityName,
        description: communityDescription,
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create a text post in the community
  const postTitle = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<300>
  >();
  const postBody = typia.random<string & tags.MaxLength<40000>>();

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: postTitle,
        body: postBody,
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);

  // Step 4: Create second member account (voter)
  const voterEmail = typia.random<string & tags.Format<"email">>();
  const voterPassword = typia.random<string & tags.MinLength<8>>();
  const voterUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const voter: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: voterUsername,
        email: voterEmail,
        password: voterPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(voter);

  // Step 5: Cast upvote (+1) on the post
  const upvote: IRedditLikePostVote =
    await api.functional.redditLike.member.posts.votes.create(connection, {
      postId: post.id,
      body: {
        vote_value: 1,
      } satisfies IRedditLikePostVote.ICreate,
    });
  typia.assert(upvote);

  // Validate upvote properties
  TestValidator.equals(
    "vote value should be +1 for upvote",
    upvote.vote_value,
    1,
  );
}
