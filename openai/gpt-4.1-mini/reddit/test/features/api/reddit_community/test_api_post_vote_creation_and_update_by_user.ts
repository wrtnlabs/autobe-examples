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

export async function test_api_post_vote_creation_and_update_by_user(
  connection: api.IConnection,
) {
  // 1. User registration (join)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "Password123!";
  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: "https://example.com/vote_test",
        referrer: "https://example.com/referrer",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(user);

  // 2. Create a new community
  const communityName = `test_community_${RandomGenerator.alphabets(6)}`;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: {
        name: communityName,
        description: "Test community for voting e2e",
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);
  TestValidator.equals("community name matches", community.name, communityName);

  // 3. Create a post in the community
  // We must pick a valid content type id; since the schema expects UUID, we generate a random one
  // For the sake of example, generate random UUID for content type
  const contentTypeId = typia.random<string & tags.Format<"uuid">>();
  const postTitle = `Test Post Title ${RandomGenerator.alphabets(5)}`;
  const postBody = `This is a test post body content created for e2e test.`;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: communityName,
        body: {
          title: postTitle,
          body: postBody,
          reddit_community_content_type_id: contentTypeId,
          status: "active",
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  typia.assert(post);
  TestValidator.equals("post title matches", post.title, postTitle);
  TestValidator.equals("post body matches", post.body, postBody);
  TestValidator.equals(
    "post community id matches",
    post.reddit_community_community_id,
    community.id,
  );

  // 4. Cast an upvote on the post
  const voteCreateBodyUpvote = {
    reddit_community_post_id: post.id,
    reddit_community_user_id: user.id,
    reddit_community_community_id: community.id,
    vote_type: "upvote",
  } satisfies IRedditCommunityPostVote.ICreate;

  const voteUpvote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.user.communities.posts.votes.createVoteOnPost(
      connection,
      {
        communityName: communityName,
        postId: post.id,
        body: voteCreateBodyUpvote,
      },
    );
  typia.assert(voteUpvote);
  TestValidator.equals("vote is upvote", voteUpvote.vote_type, "upvote");

  // 5. Attempt to cast another vote of different type to simulate vote update
  // Since update API is not provided, we create again to test business behavior
  const voteCreateBodyDownvote = {
    reddit_community_post_id: post.id,
    reddit_community_user_id: user.id,
    reddit_community_community_id: community.id,
    vote_type: "downvote",
  } satisfies IRedditCommunityPostVote.ICreate;

  const voteDownvote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.user.communities.posts.votes.createVoteOnPost(
      connection,
      {
        communityName: communityName,
        postId: post.id,
        body: voteCreateBodyDownvote,
      },
    );
  typia.assert(voteDownvote);
  TestValidator.equals("vote is downvote", voteDownvote.vote_type, "downvote");
}
