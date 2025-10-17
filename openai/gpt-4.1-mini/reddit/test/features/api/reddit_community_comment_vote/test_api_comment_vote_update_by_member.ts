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

export async function test_api_comment_vote_update_by_member(
  connection: api.IConnection,
) {
  // 1. Member joins (initial) to establish authentication
  const memberInitial = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(memberInitial);

  // 2. Create a new community as the joined member
  const community =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: {
          name:
            RandomGenerator.name(1).toLowerCase().replace(/\s+/g, "_") +
            String(Date.now()),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create a post in the community
  const postData = {
    reddit_community_community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body_text: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditCommunityPosts.ICreate;

  const post =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: postData,
      },
    );
  typia.assert(post);

  // 4. Create a comment on the post by member
  const commentBody = {
    reddit_community_post_id: post.id,
    body_text: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditCommunityComment.ICreate;

  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // 5. Create an initial vote on the comment by the member
  const initialVoteBody = {
    member_id: memberInitial.id,
    comment_id: comment.id,
    vote_value: RandomGenerator.pick([1, -1, 0] as const),
  } satisfies IRedditCommunityCommentVote.ICreate;

  const vote =
    await api.functional.redditCommunity.member.comments.commentVotes.create(
      connection,
      {
        commentId: comment.id,
        body: initialVoteBody,
      },
    );
  typia.assert(vote);

  // 6. Run a second join to impersonate the same member for vote update
  // This re-establishes auth context with a fresh token
  const memberUpdate = await api.functional.auth.member.join(connection, {
    body: {
      email: memberInitial.email,
      password: "password123",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(memberUpdate);

  // 7. Update the vote - choose a vote_value different from the initial one
  const allowedVoteValues = [1, -1, 0] as const;
  const newVoteValueCandidates = allowedVoteValues.filter(
    (v) => v !== vote.vote_value,
  );
  const newVoteValue = RandomGenerator.pick(newVoteValueCandidates);

  const updateBody = {
    vote_value: newVoteValue,
  } satisfies IRedditCommunityCommentVote.IUpdate;

  const voteUpdated =
    await api.functional.redditCommunity.member.comments.commentVotes.update(
      connection,
      {
        commentId: comment.id,
        voteId: vote.id,
        body: updateBody,
      },
    );
  typia.assert(voteUpdated);
  typia.assert<string & tags.Format<"uuid">>(voteUpdated.id);
  typia.assert<string & tags.Format<"uuid">>(voteUpdated.member_id);
  typia.assert<string & tags.Format<"uuid">>(voteUpdated.comment_id);
  typia.assert<number & tags.Type<"int32">>(voteUpdated.vote_value);

  // 8. Validate that the returned updated vote matches requested changes
  TestValidator.equals(
    "vote id should be same after update",
    voteUpdated.id,
    vote.id,
  );
  TestValidator.equals(
    "vote member_id should remain same",
    voteUpdated.member_id,
    vote.member_id,
  );
  TestValidator.equals(
    "vote comment_id should remain same",
    voteUpdated.comment_id,
    vote.comment_id,
  );
  TestValidator.equals(
    "vote vote_value should be updated",
    voteUpdated.vote_value,
    updateBody.vote_value,
  );

  // 9. Attempt to update the vote as a different member and expect error
  const otherMember = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(otherMember);

  // Now try to update the vote with different authenticated member
  await TestValidator.error("other member cannot update vote", async () => {
    await api.functional.redditCommunity.member.comments.commentVotes.update(
      connection,
      {
        commentId: comment.id,
        voteId: vote.id,
        body: {
          vote_value: 1,
        } satisfies IRedditCommunityCommentVote.IUpdate,
      },
    );
  });
}
