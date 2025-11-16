import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_reddit_community_comment_vote_update_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Register a new user and authenticate
  const userJoinBody = {
    typeName: "IRedditCommunityRegisteredUser.IJoin",
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123",
    href: "https://example.com/sign-up",
    referrer: "https://example.com",
    ip: null,
  } satisfies IRedditCommunityRegisteredUser.IJoin;
  const registeredUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert(registeredUser);

  // 2. Create a new community
  const communityCreateBody = {
    communityName: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 5,
      wordMax: 10,
    }),
    status: "active",
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);
  TestValidator.predicate(
    `communityName matches expected`,
    community.communityName === communityCreateBody.communityName,
  );

  // 3. Create a new post inside the community
  const postCreateBody = {
    community_code: community.communityName,
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 5, wordMax: 8 }),
    type: "text",
    content: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 8,
      wordMax: 15,
    }),
  } satisfies IRedditCommunityPost.ICreate;
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.posts.create(
      connection,
      {
        body: postCreateBody,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "post community code matches",
    post.community_code,
    community.communityName,
  );

  // 4. Add a comment to the post
  const commentCreateBody = {
    post_id: post.id,
    content: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 15,
    }),
    parent_comment_id: null,
  } satisfies IRedditCommunityComment.ICreate;
  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.registeredUser.redditCommunityComments.create(
      connection,
      {
        body: commentCreateBody,
      },
    );
  typia.assert(comment);
  TestValidator.equals("comment post id matches", comment.post_id, post.id);

  // 5. Cast initial vote on the comment
  const initialVoteBody = {
    reddit_community_comment_id: comment.id,
    vote: 1,
  } satisfies IRedditCommunityCommentVote.ICreate;
  const vote: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.registeredUser.redditCommunityCommentVotes.create(
      connection,
      {
        body: initialVoteBody,
      },
    );
  typia.assert(vote);
  TestValidator.equals(
    "vote comment id matches",
    vote.reddit_community_comment_id,
    comment.id,
  );
  TestValidator.equals("vote value is 1", vote.vote, 1);

  // 6. Update the vote: change vote value from 1 to -1
  const updateVoteBody = {
    vote: -1,
  } satisfies IRedditCommunityCommentVote.IUpdate;
  const updatedVote: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.registeredUser.redditCommunityCommentVotes.update(
      connection,
      {
        redditCommunityCommentVoteId: vote.id,
        body: updateVoteBody,
      },
    );
  typia.assert(updatedVote);
  TestValidator.equals(
    "updated vote id matches original",
    updatedVote.id,
    vote.id,
  );
  TestValidator.equals("updated vote value is -1", updatedVote.vote, -1);
}
