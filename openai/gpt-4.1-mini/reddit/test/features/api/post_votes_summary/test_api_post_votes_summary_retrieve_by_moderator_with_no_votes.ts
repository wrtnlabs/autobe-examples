import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_post_votes_summary_retrieve_by_moderator_with_no_votes(
  connection: api.IConnection,
): Promise<void> {
  // Test the retrieval of vote summary for a post by a moderator.
  // Scenario includes creating a community, creating a post in that community as a user,
  // then as a moderator retrieving the vote summary of that post.
  // Validate that the response correctly aggregates upvotes and downvotes counts.
  // 1. Authenticate and join as moderator.
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorJoinConnection, {
    body: {},
  });
  typia.assert(moderator);
  // 2. Authenticate and join as user.
  const userJoinConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userJoinConnection, {
    body: {},
  });
  typia.assert(user);
  // 3. Use user connection for community creation.
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: user.token.access };
  // Create a community by user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      { body: {} },
    );
  typia.assert(community);
  // 4. Create a post as user in the created community
  const postCreateBody: ICommunityPlatformPost.ICreate = {
    title: "Test Post",
    postType: "text",
    text: { content: "Post content for vote summary test." },
  };
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: postCreateBody,
      },
    );
  typia.assert(post);
  // 5. Use moderator connection for retrieving votes summary
  const moderatorConnection: api.IConnection = { host: connection.host };
  moderatorConnection.headers = { Authorization: moderator.token.access };
  // 6. Retrieve votes summary
  const voteSummary =
    await api.functional.communityPlatform.moderator.posts.votes.summary.getVotesSummary(
      moderatorConnection,
      { postId: post.id },
    );
  typia.assert(voteSummary);
  // 7. Validate the vote summary response
  TestValidator.equals("postId match", voteSummary.postId, post.id);
  TestValidator.equals("upvote count is zero", voteSummary.upvoteCount, 0);
  TestValidator.equals("downvote count is zero", voteSummary.downvoteCount, 0);
}
