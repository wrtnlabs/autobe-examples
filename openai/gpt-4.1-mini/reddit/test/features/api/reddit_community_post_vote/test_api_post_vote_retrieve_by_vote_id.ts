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

export async function test_api_post_vote_retrieve_by_vote_id(
  connection: api.IConnection,
) {
  // 1. User registration and authentication
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: "StrongP@ssw0rd",
        href: "https://test.client.app",
        referrer: "https://referrer.client.app",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(user);

  // 2. Community creation
  const communityName = RandomGenerator.alphaNumeric(8).toLowerCase();
  const communityDescription = RandomGenerator.paragraph({ sentences: 4 });
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: {
        name: communityName,
        description: communityDescription,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // 3. Post creation
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
  const postBody = RandomGenerator.content({ paragraphs: 2 });
  const contentTypeId = typia.random<string & tags.Format<"uuid">>();
  const postStatus = "active";
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName,
        body: {
          title: postTitle,
          body: postBody,
          reddit_community_content_type_id: contentTypeId,
          status: postStatus,
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  typia.assert(post);

  // 4. Vote creation on post
  const voteType: "upvote" | "downvote" = RandomGenerator.pick([
    "upvote",
    "downvote",
  ] as const);
  const voteCreateInput = {
    reddit_community_post_id: post.id,
    reddit_community_user_id: user.id,
    reddit_community_community_id: community.id,
    vote_type: voteType,
  } satisfies IRedditCommunityPostVote.ICreate;
  const vote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.user.communities.posts.votes.createVoteOnPost(
      connection,
      {
        communityName,
        postId: post.id,
        body: voteCreateInput,
      },
    );
  typia.assert(vote);

  // 5. Retrieve vote details by vote ID
  const retrievedVote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.user.communities.posts.votes.at(
      connection,
      {
        communityName,
        postId: post.id,
        voteId: vote.id,
      },
    );
  typia.assert(retrievedVote);

  // 6. Validate the retrieved vote
  TestValidator.equals(
    "vote ID matches created vote",
    retrievedVote.id,
    vote.id,
  );
  TestValidator.equals(
    "vote type matches",
    retrievedVote.vote_type,
    vote.vote_type,
  );
  TestValidator.equals(
    "vote user ID matches",
    retrievedVote.reddit_community_user_id,
    vote.reddit_community_user_id,
  );
  TestValidator.equals(
    "vote post ID matches",
    retrievedVote.reddit_community_post_id,
    vote.reddit_community_post_id,
  );
  TestValidator.equals(
    "vote community ID matches",
    retrievedVote.reddit_community_community_id,
    vote.reddit_community_community_id,
  );
}
