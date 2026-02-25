import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
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
import { generate_random_community_platform_user_communities_moderators_create } from "../../../generate/generate_random_community_platform_user_communities_moderators_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { generate_random_community_platform_user_posts_votes_create } from "../../../generate/generate_random_community_platform_user_posts_votes_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_post_vote_analytics_tracking(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123" satisfies string as string &
        tags.Format<"password">,
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create multiple users
  const userConnections: api.IConnection[] = [];
  const users: ICommunityPlatformUser.IAuthorized[] = [];
  for (let i = 0; i < 3; i++) {
    const userConnection: api.IConnection = { host: connection.host };
    const user = await authorize_user_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123" satisfies string as string &
          tags.Format<"password">,
        username: RandomGenerator.alphabets(8),
        display_name: RandomGenerator.name(),
      } satisfies ICommunityPlatformUser.IJoin,
    });
    typia.assert(user);
    userConnections.push(userConnection);
    users.push(user);
  }
  // Create posts
  const posts: ICommunityPlatformPost[] = [];
  for (let i = 0; i < 2; i++) {
    const post = await generate_random_community_platform_user_posts_create(
      userConnections[0],
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          community_name: community.name,
          post_type: "text",
          text_content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
    typia.assert(post);
    posts.push(post);
  }
  // Users cast initial votes
  const votes: ICommunityPlatformPostVote[] = [];
  const voteTypes = ["upvote", "downvote"] as const;
  for (let postIndex = 0; postIndex < posts.length; postIndex++) {
    for (let userIndex = 0; userIndex < userConnections.length; userIndex++) {
      const voteType = voteTypes[userIndex % voteTypes.length];
      const vote =
        await generate_random_community_platform_user_posts_votes_create(
          userConnections[userIndex],
          {
            params: { postId: posts[postIndex].id },
            body: {
              vote_type: voteType,
            } satisfies ICommunityPlatformPostVote.ICreate,
          },
        );
      typia.assert(vote);
      votes.push(vote);
    }
  }
  // Update some votes to track changes
  const updatedVotes: ICommunityPlatformPostVote[] = [];
  for (let i = 0; i < Math.min(2, votes.length); i++) {
    const originalVote = votes[i];
    const newVoteType =
      originalVote.vote_type === "upvote" ? "downvote" : "upvote";
    const updatedVote =
      await api.functional.communityPlatform.user.posts.votes.update(
        userConnections[i % userConnections.length],
        {
          postId: originalVote.post.id,
          voteId: originalVote.id,
          body: {
            vote_type: newVoteType,
          } satisfies ICommunityPlatformPostVote.IUpdate,
        },
      );
    typia.assert(updatedVote);
    updatedVotes.push(updatedVote);
    // Validate vote type change
    TestValidator.equals(
      "vote type should be updated",
      updatedVote.vote_type,
      newVoteType,
    );
    TestValidator.notEquals(
      "updated_at should change",
      originalVote.updated_at,
      updatedVote.updated_at,
    );
  }
  // Moderator retrieves specific vote records for analytics
  for (const vote of [...votes, ...updatedVotes]) {
    const retrievedVote =
      await api.functional.communityPlatform.moderator.posts.votes.at(
        moderatorConnection,
        {
          postId: vote.post.id,
          voteId: vote.id,
        },
      );
    typia.assert(retrievedVote);
    // Validate vote tracking accuracy
    TestValidator.equals("vote ID should match", retrievedVote.id, vote.id);
    TestValidator.equals(
      "post ID should match",
      retrievedVote.post.id,
      vote.post.id,
    );
    TestValidator.equals(
      "user ID should match",
      retrievedVote.user.id,
      vote.user.id,
    );
    TestValidator.predicate(
      "created_at should be valid timestamp",
      !isNaN(new Date(retrievedVote.created_at).getTime()),
    );
    TestValidator.predicate(
      "updated_at should be valid timestamp",
      !isNaN(new Date(retrievedVote.updated_at).getTime()),
    );
    // Validate vote type consistency
    TestValidator.predicate(
      "vote type should be valid",
      retrievedVote.vote_type === "upvote" ||
        retrievedVote.vote_type === "downvote",
    );
  }
  // Validate relationship integrity
  // Test that updated votes maintain proper associations
  for (const updatedVote of updatedVotes) {
    const matchingOriginal = votes.find((v) => v.id === updatedVote.id);
    TestValidator.predicate(
      "updated vote should have matching original",
      matchingOriginal !== undefined,
    );
    if (matchingOriginal) {
      TestValidator.equals(
        "user association should persist",
        updatedVote.user.id,
        matchingOriginal.user.id,
      );
      TestValidator.equals(
        "post association should persist",
        updatedVote.post.id,
        matchingOriginal.post.id,
      );
    }
  }
}
