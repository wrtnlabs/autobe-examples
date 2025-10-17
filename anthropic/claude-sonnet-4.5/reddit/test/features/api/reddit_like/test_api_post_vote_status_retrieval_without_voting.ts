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
 * Test retrieving vote status on a post when the user has not voted on it yet.
 *
 * This test validates that the system correctly indicates a neutral vote state
 * (no vote cast) when users check their vote status on posts they haven't
 * interacted with. This ensures the voting UI correctly reflects the user's
 * voting history and prevents displaying incorrect vote states.
 *
 * Workflow:
 *
 * 1. Create first member account (post author)
 * 2. First member creates a community
 * 3. First member creates a post in the community
 * 4. Create second member account (vote status checker)
 * 5. Second member checks vote status on the post without voting
 * 6. Validate response indicates no vote exists
 */
export async function test_api_post_vote_status_retrieval_without_voting(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (post author)
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const author: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: authorEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(author);

  // Step 2: First member creates a community
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
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
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: First member creates a post in the community
  const postTypes = ["text", "link", "image"] as const;
  const postType = RandomGenerator.pick(postTypes);

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: postType,
        title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
        body:
          postType === "text"
            ? typia.random<string & tags.MaxLength<40000>>()
            : undefined,
        url:
          postType === "link"
            ? typia.random<string & tags.MaxLength<2000>>()
            : undefined,
        image_url: postType === "image" ? typia.random<string>() : undefined,
        caption:
          postType === "image"
            ? typia.random<string & tags.MaxLength<10000>>()
            : undefined,
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);

  // Step 4: Create second member account (vote status checker)
  const checkerEmail = typia.random<string & tags.Format<"email">>();
  const checker: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: checkerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(checker);

  // Step 5: Second member checks vote status on the post without having voted
  const voteStatus: IRedditLikePostVote.IUserVoteStatus =
    await api.functional.redditLike.posts.votes.me.at(connection, {
      postId: post.id,
    });
  typia.assert(voteStatus);

  // Step 6: Validate that the response indicates no vote exists
  TestValidator.equals(
    "vote status should indicate no vote",
    voteStatus.voted,
    false,
  );
  TestValidator.equals(
    "vote value should be undefined when not voted",
    voteStatus.vote_value,
    undefined,
  );
}
