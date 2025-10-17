import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";

/**
 * Test that an administrator can retrieve their vote status on a post.
 *
 * This scenario validates the vote status retrieval functionality:
 *
 * 1. Admin creates account and authenticates
 * 2. Admin creates community
 * 3. Admin creates post in community
 * 4. Admin retrieves vote status (no vote cast scenario)
 *
 * The response should correctly indicate no vote has been cast yet.
 */
export async function test_api_admin_post_vote_status_retrieval(
  connection: api.IConnection,
) {
  // 1. Admin creates account and authenticates
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // 2. Admin creates community
  const communityData = {
    code: RandomGenerator.alphaNumeric(10).toLowerCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
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

  // 3. Admin creates post in community
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.admin.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // 4. Admin retrieves vote status (no vote cast yet)
  const voteStatus: IRedditLikePostVote.IUserVoteStatus =
    await api.functional.redditLike.admin.posts.votes.me.getMyVote(connection, {
      postId: post.id,
    });
  typia.assert(voteStatus);

  // Validate business logic: when no vote has been cast, voted should be false
  TestValidator.equals(
    "vote status should indicate no vote when none cast",
    voteStatus.voted,
    false,
  );
}
