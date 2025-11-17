import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_redditcommunity_post_vote_detail_access_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Register a new user via join
  const user: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        email: `test+${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: "strongPassword123",
      } satisfies IRedditCommunityRegisteredUser.ICreate,
    });
  typia.assert(user);

  // 2. Create a community by the registered user
  const communityCreateBody = {
    communityName: RandomGenerator.alphabets(8).toLowerCase(),
    displayName: RandomGenerator.name(),
    description: RandomGenerator.content({ paragraphs: 1 }),
    imageUrl: null,
    isPrivate: false,
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3. Create a post in the community by the registered user
  const postCreateBody = {
    reddit_community_community_id:
      community.communityName satisfies string as string & tags.Format<"uuid">,
    type: "text" as const,
    title: RandomGenerator.paragraph({ sentences: 5 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.create(
      connection,
      { body: postCreateBody },
    );
  typia.assert(post);

  // 4. Retrieve the details of a specific vote on the post with a random, plausible vote id
  const postVoteId = typia.random<string & tags.Format<"uuid">>();

  const voteDetail: IRedditCommunityPostVote =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.postVotes.at(
      connection,
      {
        postId: post.id,
        postVoteId: postVoteId,
      },
    );
  typia.assert(voteDetail);

  // 5. Validate that the returned vote detail matches the post id requested
  TestValidator.equals(
    "post id matched",
    voteDetail.reddit_community_post_id,
    post.id,
  );
}
