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

export async function test_api_reddit_community_member_create_post_vote(
  connection: api.IConnection,
) {
  // Step 1: Member joins (creates an account and obtains authorization token)
  const memberJoinBody = {
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditCommunityMember.ICreate;
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberJoinBody });
  typia.assert(member);

  // Step 2: Member creates a community
  const communityCreateBody = {
    name: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // Step 3: Member creates a text post in the community
  const postCreateBody = {
    author_member_id: member.id,
    reddit_community_community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 10,
    }).slice(0, 300),
    body_text: RandomGenerator.content({ paragraphs: 2 }),
    link_url: null,
    image_url: null,
  } satisfies IRedditCommunityPosts.ICreate;
  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: postCreateBody,
      },
    );
  typia.assert(post);

  // Step 4: Member creates a post vote (+1 upvote) on the post
  const postVoteCreateBody = {
    member_id: member.id,
    post_id: post.id,
    vote_value: 1,
  } satisfies IRedditCommunityPostVote.ICreate;
  const vote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.member.posts.postVotes.createPostVote(
      connection,
      {
        postId: post.id,
        body: postVoteCreateBody,
      },
    );
  typia.assert(vote);

  // Validation: The vote's member_id and post_id must match the creating member and post
  TestValidator.equals(
    "post vote member_id matches",
    vote.member_id,
    member.id,
  );
  TestValidator.equals("post vote post_id matches", vote.post_id, post.id);
  TestValidator.equals("post vote value is 1 (upvote)", vote.vote_value, 1);

  // Step 5: Attempting to create a second vote by same member on same post should error
  await TestValidator.error(
    "duplicate vote by same member on same post should fail",
    async () => {
      await api.functional.redditCommunity.member.posts.postVotes.createPostVote(
        connection,
        {
          postId: post.id,
          body: {
            member_id: member.id,
            post_id: post.id,
            vote_value: -1,
          } satisfies IRedditCommunityPostVote.ICreate,
        },
      );
    },
  );
}
