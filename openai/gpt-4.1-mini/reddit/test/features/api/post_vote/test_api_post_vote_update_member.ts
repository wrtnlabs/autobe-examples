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
 * Test updating an existing vote on a Reddit community post by a member user.
 *
 * Business flow:
 *
 * 1. Register and authenticate a new member user.
 * 2. Create a new community.
 * 3. Create a new post in the created community.
 * 4. Cast an initial vote on the post by the member.
 * 5. Update the vote's value (e.g., change upvote to downvote).
 *
 * Each step calls the corresponding API and asserts the correctness of the
 * result using typia assertions and TestValidator for business logic
 * validation. The final updated vote entity is validated for correctness.
 */
export async function test_api_post_vote_update_member(
  connection: api.IConnection,
) {
  // 1. Member registration and authentication
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "P@ssw0rd123",
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
          description: `Test community created for e2e test - ${communityName}`,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create a post within the community
  // We create a text post with valid content
  const postTitle = `Post title ${RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 })}`;
  const postBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 6,
    sentenceMax: 12,
    wordMin: 3,
    wordMax: 8,
  });

  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: {
          // author_member_id and guest id are handled by backend from auth context
          reddit_community_community_id: community.id,
          post_type: "text",
          title: postTitle,
          body_text: postBody,
          link_url: null,
          image_url: null,
        } satisfies IRedditCommunityPosts.ICreate,
      },
    );
  typia.assert(post);

  TestValidator.equals(
    "post community id matches",
    post.reddit_community_community_id,
    community.id,
  );

  // 4. Cast an initial vote for the post as the member (+1 upvote)
  const initialVoteValue = 1;
  const postVote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.member.posts.postVotes.createPostVote(
      connection,
      {
        postId: post.id,
        body: {
          member_id: member.id,
          post_id: post.id,
          vote_value: initialVoteValue,
        } satisfies IRedditCommunityPostVote.ICreate,
      },
    );
  typia.assert(postVote);

  TestValidator.equals(
    "post vote member id matches",
    postVote.member_id,
    member.id,
  );
  TestValidator.equals("post vote post id matches", postVote.post_id, post.id);
  TestValidator.equals(
    "post vote value initial",
    postVote.vote_value,
    initialVoteValue,
  );

  // 5. Update the vote value to -1 (downvote)
  const updatedVoteValue = -1;
  const updatedPostVote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.member.posts.postVotes.updatePostVote(
      connection,
      {
        postId: post.id,
        voteId: postVote.id,
        body: {
          vote_value: updatedVoteValue,
        } satisfies IRedditCommunityPostVote.IUpdate,
      },
    );
  typia.assert(updatedPostVote);

  TestValidator.equals(
    "updated vote id matches",
    updatedPostVote.id,
    postVote.id,
  );
  TestValidator.equals(
    "updated vote member id matches",
    updatedPostVote.member_id,
    member.id,
  );
  TestValidator.equals(
    "updated vote post id matches",
    updatedPostVote.post_id,
    post.id,
  );
  TestValidator.equals(
    "updated vote value is updated",
    updatedPostVote.vote_value,
    updatedVoteValue,
  );
}
