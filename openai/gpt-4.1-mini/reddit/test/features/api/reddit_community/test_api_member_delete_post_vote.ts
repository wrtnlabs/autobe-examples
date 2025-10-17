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
 * This E2E test validates the full flow for a RedditCommunity member to delete
 * a post vote.
 *
 * Business steps included:
 *
 * 1. Member registration with email and password, obtaining authorization token.
 * 2. Member creates a new community providing a unique community name and optional
 *    description.
 * 3. Member creates a text post within the community with a meaningful title and
 *    body text.
 * 4. Member creates an initial upvote (+1) on the post.
 * 5. Member deletes the previously created post vote by voteId.
 *
 * Validation points:
 *
 * - Each created entity is extensively validated with typia.assert.
 * - Assert ids consistency between dependent objects (communityId, postId,
 *   voteId).
 * - Validate that erasePostVote call completes without errors.
 */
export async function test_api_member_delete_post_vote(
  connection: api.IConnection,
) {
  // 1. Member registration and authentication
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "StrongP@ssw0rd!",
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a new community
  const communityName = `community_${RandomGenerator.alphaNumeric(8)}`;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create a text post in the community
  const postTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 5,
    wordMax: 10,
  });
  const postBodyText = RandomGenerator.content({ paragraphs: 3 });
  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: {
          post_type: "text",
          title: postTitle,
          body_text: postBodyText,
          reddit_community_community_id: community.id,
          author_member_id: member.id,
        } satisfies IRedditCommunityPosts.ICreate,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "post belongs to community",
    post.reddit_community_community_id,
    community.id,
  );

  // 4. Create an upvote (+1) on the post by the member
  const voteCreateBody = {
    member_id: member.id,
    post_id: post.id,
    vote_value: 1,
  } satisfies IRedditCommunityPostVote.ICreate;
  const vote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.member.posts.postVotes.createPostVote(
      connection,
      {
        postId: post.id,
        body: voteCreateBody,
      },
    );
  typia.assert(vote);
  TestValidator.equals("vote belongs to post", vote.post_id, post.id);
  TestValidator.equals("vote belongs to member", vote.member_id, member.id);

  // 5. Delete the post vote using erasePostVote
  await api.functional.redditCommunity.member.posts.postVotes.erasePostVote(
    connection,
    {
      postId: post.id,
      voteId: vote.id,
    },
  );
}
