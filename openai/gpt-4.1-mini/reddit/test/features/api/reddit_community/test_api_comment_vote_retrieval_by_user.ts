import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

export async function test_api_comment_vote_retrieval_by_user(
  connection: api.IConnection,
) {
  // 1. User registration and authentication
  const email: string = typia.random<string & tags.Format<"email">>();
  const password = "P@ssw0rd123";
  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: email,
        password: password,
        ip: null,
        href: "https://redditcommunity.example.com/signup",
        referrer: "https://redditcommunity.example.com",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(user);

  // 2. Create a community
  const communityCreateBody = {
    name: RandomGenerator.name(1).toLowerCase().replace(/\s+/g, ""),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: communityCreateBody,
    });
  typia.assert(community);

  // 3. Create a post in the community
  const contentTypes = ["text", "link", "image"] as const;
  const contentType = RandomGenerator.pick(contentTypes);

  // contentType requires a valid UUID, but schema only shows it is uuid format string
  // So we randomly generate a UUID string to represent a content type as per correct typing
  const reddit_community_content_type_id = typia.random<
    string & tags.Format<"uuid">
  >();

  const postCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    image_uri:
      contentType === "image"
        ? typia.random<string & tags.Format<"uri">>()
        : null,
    reddit_community_content_type_id: reddit_community_content_type_id,
    status: "active",
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: community.name,
        body: postCreateBody,
      },
    );
  typia.assert(post);

  // 4. Create a comment on the post
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 5 }),
    parent_id: null,
  } satisfies IRedditCommunityComment.ICreate;
  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.user.communities.posts.comments.create(
      connection,
      {
        communityName: community.name,
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 5. Create a vote on the comment
  const voteTypes = ["upvote", "downvote"] as const;
  const vote_type = RandomGenerator.pick(voteTypes);
  const commentVoteCreateBody = {
    reddit_community_comment_id: comment.id,
    vote_type: vote_type,
  } satisfies IRedditCommunityCommentVote.ICreate;

  const vote: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.user.communities.comments.votes.create(
      connection,
      {
        communityName: community.name,
        commentId: comment.id,
        body: commentVoteCreateBody,
      },
    );
  typia.assert(vote);

  // 6. Retrieve vote details by vote ID
  const voteRetrieved: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.user.communities.comments.votes.at(
      connection,
      {
        communityName: community.name,
        commentId: comment.id,
        voteId: vote.id,
      },
    );
  typia.assert(voteRetrieved);

  // 7. Validate the vote details
  TestValidator.equals("vote id matches", voteRetrieved.id, vote.id);
  TestValidator.equals(
    "vote user id matches",
    voteRetrieved.reddit_community_user_id,
    user.id,
  );
  TestValidator.equals(
    "vote comment id matches",
    voteRetrieved.reddit_community_comment_id,
    comment.id,
  );
  TestValidator.equals(
    "vote community id matches",
    voteRetrieved.reddit_community_community_id,
    community.id,
  );
  TestValidator.equals("vote type matches", voteRetrieved.vote_type, vote_type);
}
