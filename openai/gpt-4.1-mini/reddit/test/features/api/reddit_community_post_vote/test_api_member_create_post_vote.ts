import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPosts";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

/**
 * Test creation of a new vote on a post by an authenticated member.
 *
 * The test performs these steps:
 *
 * 1. Authenticate a member with email and password.
 * 2. Create a new community with a unique name.
 * 3. Create a new post in the community with 'text' post type.
 * 4. Create a new post vote by the authenticated member on the created post.
 *
 * Validations ensure that the vote value is one of +1, -1, or 0. All API
 * responses are verified with typia.assert for type safety. TestValidator
 * confirms the correctness of the vote properties.
 */
export async function test_api_member_create_post_vote(
  connection: api.IConnection,
) {
  // 1. Member joins (registers and authenticates)
  const joinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: "password123",
  } satisfies IRedditCommunityMember.ICreate;
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a community
  const communityBody = {
    name: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3. Create a post in the community
  const postBody = {
    reddit_community_community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body_text: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 8,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRedditCommunityPosts.ICreate;
  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: postBody,
      },
    );
  typia.assert(post);

  // 4. Create a post vote by the member on the post
  const voteValueList = [+1, -1, 0] as const;
  const vote_value = RandomGenerator.pick(voteValueList);
  const voteBody = {
    member_id: member.id,
    post_id: post.id,
    vote_value,
  } satisfies IRedditCommunityPostVote.ICreate;
  const postVote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.member.posts.postVotes.createPostVote(
      connection,
      {
        postId: post.id,
        body: voteBody,
      },
    );
  typia.assert(postVote);

  // Validations for vote correctness
  TestValidator.equals(
    "vote_value should be correct",
    postVote.vote_value,
    vote_value,
  );

  TestValidator.equals(
    "postVote's post_id should match post.id",
    postVote.post_id,
    post.id,
  );
  TestValidator.equals(
    "postVote's member_id should match member.id",
    postVote.member_id,
    member.id,
  );
}
