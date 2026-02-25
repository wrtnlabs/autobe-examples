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

export async function test_api_moderator_vote_audit_verification(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator account for audit capabilities
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  // Create regular voting users
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user1);
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user2);
  // Create testing community structure
  const community =
    await generate_random_community_platform_user_communities_create(
      user1Connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Assign moderator permissions for community access
  const moderatorAssignment =
    await generate_random_community_platform_user_communities_moderators_create(
      user1Connection,
      {
        body: {
          user_id: moderator.id,
          role_level: "full",
          notes: "Vote audit testing moderator",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
        params: { communityId: community.id },
      },
    );
  typia.assert(moderatorAssignment);
  // Create post for voting audit scenarios
  const post = await generate_random_community_platform_user_posts_create(
    user1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // User casts upvote for positive engagement tracking
  const upvote =
    await generate_random_community_platform_user_posts_votes_create(
      user1Connection,
      {
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
        params: { postId: post.id },
      },
    );
  typia.assert(upvote);
  // Different user casts downvote for contrast analysis
  const downvote =
    await generate_random_community_platform_user_posts_votes_create(
      user2Connection,
      {
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
        params: { postId: post.id },
      },
    );
  typia.assert(downvote);
  // Test vote change scenario to verify audit trail captures updates
  const updatedDownvote =
    await generate_random_community_platform_user_posts_votes_create(
      user2Connection,
      {
        body: {
          vote_type: "upvote", // Change from downvote to upvote
        } satisfies ICommunityPlatformPostVote.ICreate,
        params: { postId: post.id },
      },
    );
  typia.assert(updatedDownvote);
  // Test moderator vote audit verification
  const retrievedUpvote =
    await api.functional.communityPlatform.moderator.posts.votes.at(
      moderatorConnection,
      {
        postId: post.id,
        voteId: upvote.id,
      },
    );
  typia.assert(retrievedUpvote);
  const retrievedUpdatedVote =
    await api.functional.communityPlatform.moderator.posts.votes.at(
      moderatorConnection,
      {
        postId: post.id,
        voteId: updatedDownvote.id,
      },
    );
  typia.assert(retrievedUpdatedVote);
  // Validate vote integrity checks
  TestValidator.equals("upvote ID matches", retrievedUpvote.id, upvote.id);
  TestValidator.equals(
    "updated vote ID matches",
    retrievedUpdatedVote.id,
    updatedDownvote.id,
  );
  TestValidator.equals(
    "upvote post ID matches",
    retrievedUpvote.post.id,
    post.id,
  );
  TestValidator.equals(
    "updated vote post ID matches",
    retrievedUpdatedVote.post.id,
    post.id,
  );
  TestValidator.equals(
    "upvote type correct",
    retrievedUpvote.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "updated vote type correct",
    retrievedUpdatedVote.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "upvote user ID matches",
    retrievedUpvote.user.id,
    user1.id,
  );
  TestValidator.equals(
    "updated vote user ID matches",
    retrievedUpdatedVote.user.id,
    user2.id,
  );
  // Validate vote metadata completeness
  TestValidator.predicate(
    "upvote has creation timestamp",
    retrievedUpvote.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated vote has creation timestamp",
    retrievedUpdatedVote.created_at !== undefined,
  );
  TestValidator.predicate(
    "upvote has update timestamp",
    retrievedUpvote.updated_at !== undefined,
  );
  TestValidator.predicate(
    "updated vote has update timestamp",
    retrievedUpdatedVote.updated_at !== undefined,
  );
  // Validate timestamp logical order
  TestValidator.predicate(
    "creation before update for upvote",
    new Date(retrievedUpvote.created_at) <=
      new Date(retrievedUpvote.updated_at),
  );
  TestValidator.predicate(
    "creation before update for updated vote",
    new Date(retrievedUpdatedVote.created_at) <=
      new Date(retrievedUpdatedVote.updated_at),
  );
  // Test moderator permissions validation - non-moderator should fail
  await TestValidator.error(
    "non-moderator cannot access vote audit",
    async () => {
      await api.functional.communityPlatform.moderator.posts.votes.at(
        user1Connection, // Regular user connection, not moderator
        {
          postId: post.id,
          voteId: upvote.id,
        },
      );
    },
  );
  // Test vote audit verification with invalid vote ID (should fail)
  await TestValidator.error("invalid vote ID should fail", async () => {
    await api.functional.communityPlatform.moderator.posts.votes.at(
      moderatorConnection,
      {
        postId: post.id,
        voteId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  // Test vote audit verification with mismatched post ID (should fail)
  await TestValidator.error("mismatched post ID should fail", async () => {
    await api.functional.communityPlatform.moderator.posts.votes.at(
      moderatorConnection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        voteId: upvote.id,
      },
    );
  });
}
