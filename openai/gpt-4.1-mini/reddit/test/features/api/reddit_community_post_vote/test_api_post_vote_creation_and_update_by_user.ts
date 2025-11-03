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
  // 1. User registration (join) to obtain auth token
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: "StrongP@ssw0rd!",
        href: "https://example.com/auth/register",
        referrer: "https://example.com",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(user);

  // 2. Create a new community
  const communityName: string = `test_community_${RandomGenerator.alphaNumeric(6)}`;
  const communityCreateBody = {
    name: communityName,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: communityCreateBody,
    });
  typia.assert(community);

  TestValidator.equals("community name matches", community.name, communityName);

  // 3. Create a new post within the created community
  // Use generated UUID for content type as example
  const contentTypeId = typia.random<string & tags.Format<"uuid">>();

  const postCreateBody = {
    title: `Test post title ${RandomGenerator.alphaNumeric(6)}`,
    body: RandomGenerator.content({ paragraphs: 3 }),
    image_uri: null,
    reddit_community_content_type_id: contentTypeId,
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

  TestValidator.equals("post title matches", post.title, postCreateBody.title);
  TestValidator.equals(
    "post community id matches community",
    post.reddit_community_community_id,
    community.id,
  );

  // 4. Cast a new vote (upvote) on the post
  // Create a random voteId for initial upvote
  const initialVoteId = typia.random<string & tags.Format<"uuid">>();

  const initialVoteBody = {
    vote_type: "upvote",
  } satisfies IRedditCommunityPostVote.IUpdate;

  const initialVote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.user.communities.posts.votes.updateVoteOnPost(
      connection,
      {
        communityName: community.name,
        postId: post.id,
        voteId: initialVoteId,
        body: initialVoteBody,
      },
    );
  typia.assert(initialVote);

  TestValidator.equals(
    "initial vote type is upvote",
    initialVote.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "initial vote linked to community",
    initialVote.reddit_community_community_id,
    community.id,
  );
  TestValidator.equals(
    "initial vote linked to post",
    initialVote.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "initial vote linked to user",
    initialVote.reddit_community_user_id,
    user.id,
  );

  // 5. Update the vote to downvote to validate vote update
  const updatedVoteBody = {
    vote_type: "downvote",
  } satisfies IRedditCommunityPostVote.IUpdate;

  const updatedVote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.user.communities.posts.votes.updateVoteOnPost(
      connection,
      {
        communityName: community.name,
        postId: post.id,
        voteId: initialVote.id,
        body: updatedVoteBody,
      },
    );
  typia.assert(updatedVote);

  TestValidator.equals(
    "updated vote type is downvote",
    updatedVote.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "updated vote linked to community",
    updatedVote.reddit_community_community_id,
    community.id,
  );
  TestValidator.equals(
    "updated vote linked to post",
    updatedVote.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "updated vote linked to user",
    updatedVote.reddit_community_user_id,
    user.id,
  );
}
