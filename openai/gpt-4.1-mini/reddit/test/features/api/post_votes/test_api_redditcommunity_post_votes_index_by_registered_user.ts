import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_redditcommunity_post_votes_index_by_registered_user(
  connection: api.IConnection,
) {
  // Step 1: Register a new user via join
  const registeredUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IRedditCommunityRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  // Step 2: Create a new community
  const communityName = RandomGenerator.alphabets(15);
  const communityCreateBody = {
    communityName: communityName,
    displayName: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    imageUrl: null,
    isPrivate: false,
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "communityName matches",
    community.communityName,
    communityCreateBody.communityName,
  );
  TestValidator.equals(
    "displayName matches",
    community.displayName,
    communityCreateBody.displayName,
  );

  // Step 3: Create a new post in that community
  const postCreateBody = {
    reddit_community_community_id: typia.random<
      string & tags.Format<"uuid">
    >() satisfies string as string,
    type: "text" as const,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.create(
      connection,
      {
        body: postCreateBody,
      },
    );
  typia.assert(post);
  TestValidator.equals("post title matches", post.title, postCreateBody.title);

  // Step 4: Retrieve the paginated list of post votes for that post
  const postId = post.id;
  const postVotesRequestBody = {
    page: 1,
    limit: 10,
    reddit_community_post_id: postId,
    reddit_community_registereduser_id: registeredUser.id,
  } satisfies IRedditCommunityPostVote.IRequest;

  const postVotesPage: IPageIRedditCommunityPostVote.ISummary =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.postVotes.index(
      connection,
      {
        postId,
        body: postVotesRequestBody,
      },
    );
  typia.assert(postVotesPage);
  TestValidator.equals(
    "pagination page matches",
    postVotesPage.pagination.current,
    postVotesRequestBody.page,
  );
  TestValidator.equals(
    "pagination limit matches",
    postVotesPage.pagination.limit,
    postVotesRequestBody.limit,
  );
}
