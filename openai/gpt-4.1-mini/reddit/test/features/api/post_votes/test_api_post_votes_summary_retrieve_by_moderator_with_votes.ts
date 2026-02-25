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
import { generate_random_community_platform_moderator_posts_votes_create_vote } from "../../../generate/generate_random_community_platform_moderator_posts_votes_create_vote";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_post_votes_summary_retrieve_by_moderator_with_votes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator joins and logs in
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(),
    },
  });
  moderatorConnection.headers = { Authorization: moderatorAuth.token.access };
  // 2. Create a community as a user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  userConnection.headers = { Authorization: userAuth.token.access };
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Create a post in the community
  const postBody: ICommunityPlatformPost.ICreate = {
    title: RandomGenerator.name(),
    postType: "text",
    text: RandomGenerator.paragraph({ sentences: 3 }),
  };
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: postBody,
      },
    );
  typia.assert(post);
  // 4. Cast votes on the post from different users
  const voteTypes: string[] = ["upvote", "downvote"];
  // Create multiple user voters
  const votersCount = 3; // number of voting users
  const votes: {
    type: string;
    connection: api.IConnection;
  }[] = [];
  for (let i = 0; i < votersCount; i++) {
    const voterConnection: api.IConnection = { host: connection.host };
    const voterAuth = await authorize_user_join(voterConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        username: RandomGenerator.name(),
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    });
    voterConnection.headers = { Authorization: voterAuth.token.access };
    // Choose vote type for this voter
    const voteType = voteTypes[i % voteTypes.length];
    const voteBody: ICommunityPlatformPostVote.ICreate = {
      post_id: post.id,
      vote_type: voteType,
    };
    await generate_random_community_platform_moderator_posts_votes_create_vote(
      voterConnection as api.IConnection,
      { params: { postId: post.id }, body: voteBody },
    );
    votes.push({ type: voteType, connection: voterConnection });
  }
  // 5. Moderator retrieves vote summary for the post
  const voteSummary =
    await api.functional.communityPlatform.moderator.posts.votes.summary.getVotesSummary(
      moderatorConnection,
      { postId: post.id },
    );
  typia.assert(voteSummary);
  // Calculate expected counts
  const expectedUpvoteCount = votes.filter((v) => v.type === "upvote").length;
  const expectedDownvoteCount = votes.filter(
    (v) => v.type === "downvote",
  ).length;
  // Validate vote counts
  TestValidator.equals(
    "upvote count matches",
    voteSummary.upvoteCount,
    expectedUpvoteCount,
  );
  TestValidator.equals(
    "downvote count matches",
    voteSummary.downvoteCount,
    expectedDownvoteCount,
  );
}
