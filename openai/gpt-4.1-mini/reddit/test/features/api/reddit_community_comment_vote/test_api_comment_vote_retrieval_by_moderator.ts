import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

export async function test_api_comment_vote_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // 1. Moderator signs up
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "1234",
        ip: "127.0.0.1",
        href: "https://example.com",
        referrer: "https://referrer.com",
      } satisfies IRedditCommunityModerator.IJoin,
    });
  typia.assert(moderator);

  // 2. User signs up
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: "1234",
        ip: "127.0.0.1",
        href: "https://example.com",
        referrer: "https://referrer.com",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(user);

  // 3. Create community
  const communityName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 4,
    wordMax: 10,
  })
    .replace(/\s+/g, "_")
    .toLowerCase();
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: {
        name: communityName,
        description: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 10,
        }),
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // 4. Create post in the community
  const contentTypes = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];
  // For test, just pick one content type randomly
  const contentTypeId = RandomGenerator.pick(contentTypes);
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
      wordMin: 4,
      wordMax: 8,
    }),
    image_uri: null,
    reddit_community_content_type_id: contentTypeId,
    status: "active",
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: community.name,
        body: postBody,
      },
    );
  typia.assert(post);

  // 5. Add comment to the post
  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    parent_id: null,
  } satisfies IRedditCommunityComment.ICreate;

  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.user.communities.posts.comments.create(
      connection,
      {
        communityName: community.name,
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // 6. Moderator creates a vote on the comment
  const voteBody = {
    reddit_community_comment_id: comment.id,
    vote_type: RandomGenerator.pick(["upvote", "downvote"] as const),
  } satisfies IRedditCommunityCommentVote.ICreate;

  const vote: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.moderator.communities.comments.votes.create(
      connection,
      {
        communityName: community.name,
        commentId: comment.id,
        body: voteBody,
      },
    );
  typia.assert(vote);

  // 7. Retrieve the vote details by vote ID as moderator
  const voteDetail: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.moderator.communities.comments.votes.at(
      connection,
      {
        communityName: community.name,
        commentId: comment.id,
        voteId: vote.id,
      },
    );
  typia.assert(voteDetail);

  // Validate retrieved vote data correctness
  TestValidator.equals("vote id should match", voteDetail.id, vote.id);
  TestValidator.equals(
    "vote comment id should match",
    voteDetail.reddit_community_comment_id,
    comment.id,
  );
  TestValidator.equals(
    "vote user id should match",
    voteDetail.reddit_community_user_id,
    moderator.id,
  );
  TestValidator.equals(
    "vote community id should match",
    voteDetail.reddit_community_community_id,
    community.id,
  );
  TestValidator.predicate(
    "vote type should be valid",
    voteDetail.vote_type === "upvote" || voteDetail.vote_type === "downvote",
  );
}
