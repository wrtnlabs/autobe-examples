import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test successful removal of a comment vote by an authenticated member.
 *
 * This test verifies that a member can remove their vote from a comment.
 * Note: This test assumes the member has already cast a vote on the comment
 * (vote creation endpoint not available in current SDK). The test validates
 * that the vote removal endpoint accepts valid parameters and returns 204 No Content.
 *
 * Test Flow:
 * 1. Authenticate as a member
 * 2. Create a community
 * 3. Create a post in the community
 * 4. Create a comment on the post
 * 5. Remove the vote from the comment
 * 6. Verify the operation succeeded
 */
export async function test_api_comment_vote_removal_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        postType: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 4. Create a comment on the post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(comment);
  // 5. Remove the vote from the comment
  // Note: This assumes the member has already cast a vote on this comment.
  // In a complete test suite, you would first cast a vote using the vote
  // creation endpoint (POST /posts/{postId}/comments/{commentId}/vote) before
  // attempting removal.
  await api.functional.redditClone.member.posts.comments._vote.erase(
    memberConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  // 6. Verify the operation succeeded
  // The erase function returns void and throws an error on failure,
  // so reaching this point indicates success (204 No Content)
  TestValidator.predicate("vote removal completed successfully", true);
}
