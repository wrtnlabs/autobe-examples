import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostVote";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityContentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentType";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

export async function test_api_post_vote_retrieval_by_user(
  connection: api.IConnection,
) {
  // 1. User registration
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "P@ssw0rd123";
  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        ip: null,
        href: "https://example.com/signup",
        referrer: "https://google.com",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(user);

  // 2. User login
  const loggedInUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        ip: null,
        href: "https://example.com/login",
        referrer: "https://example.com/signup",
      } satisfies IRedditCommunityUser.ILogin,
    });
  typia.assert(loggedInUser);

  // 3. Create a post content type named 'text'
  const contentType: IRedditCommunityContentType =
    await api.functional.redditCommunity.admin.redditCommunityContentTypes.create(
      connection,
      {
        body: {
          content_type_code: "text",
          content_type_name: "Text",
          description: "Text content type",
        } satisfies IRedditCommunityContentType.ICreate,
      },
    );
  typia.assert(contentType);

  // 4. Create a community
  const communityName = `test_community_${RandomGenerator.alphaNumeric(6)}`;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: {
        name: communityName,
        description: "Community created for vote retrieval test",
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // 5. Create a post in the community
  const postTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 8,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 6,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 7,
  });
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: postTitle,
          body: postBody,
          reddit_community_content_type_id: contentType.id,
          status: "active",
          image_uri: null,
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  typia.assert(post);

  // 6. Create a vote for the post - pick randomly 'upvote' or 'downvote'
  const voteType = RandomGenerator.pick(["upvote", "downvote"] as const);
  const voteResponse: IPageIRedditCommunityPostVote.ISummary =
    await api.functional.redditCommunity.user.communities.posts.votes.index(
      connection,
      {
        communityName: community.name,
        postId: post.id,
        body: {
          vote_type: voteType,
        } satisfies IRedditCommunityPostVote.IRequest,
      },
    );
  typia.assert(voteResponse);

  // The vote list must have one or more votes, find the vote just created
  // Because the vote index returns a page, pick the vote with matching user and vote_type
  const vote = voteResponse.data.find(
    (v) => v.reddit_community_user_id === user.id && v.vote_type === voteType,
  );
  typia.assert(vote!);

  // 7. Fetch the vote by voteId
  const detailedVote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.user.communities.posts.votes.at(
      connection,
      {
        communityName: community.name,
        postId: post.id,
        voteId: vote!.id,
      },
    );
  typia.assert(detailedVote);

  // 8. Validate the vote matches the created vote
  TestValidator.equals("vote id matches", detailedVote.id, vote!.id);
  TestValidator.equals(
    "vote post id matches",
    detailedVote.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "vote user id matches",
    detailedVote.reddit_community_user_id,
    user.id,
  );
  TestValidator.equals("vote type matches", detailedVote.vote_type, voteType);
  TestValidator.equals(
    "vote community id matches",
    detailedVote.reddit_community_community_id,
    community.id,
  );
  TestValidator.predicate(
    "vote has created_at timestamp",
    typeof detailedVote.created_at === "string" &&
      detailedVote.created_at.length > 0,
  );
  TestValidator.predicate(
    "vote has updated_at timestamp",
    typeof detailedVote.updated_at === "string" &&
      detailedVote.updated_at.length > 0,
  );
}
