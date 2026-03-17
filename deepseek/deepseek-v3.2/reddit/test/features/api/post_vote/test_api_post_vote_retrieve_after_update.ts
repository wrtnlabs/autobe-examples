import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_votes_create } from "../../../generate/generate_random_community_platform_member_posts_votes_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test retrieving vote details after vote modification.
 * 1. Authenticate a member using authorize_member_join
 * 2. Create a community
 * 3. Subscribe to the community
 * 4. Create a text post in the community
 * 5. Cast initial downvote on the post using generate_random_community_platform_member_posts_votes_create
 * 6. Retrieve the vote using api.functional.communityPlatform.member.posts.votes.at
 * 7. Validate the vote type is 'down' and created_at equals updated_at (initial vote)
 * 8. Update vote to upvote using generate_random_community_platform_member_posts_votes_create
 * 9. Retrieve the vote again
 * 10. Validate vote type changed to 'up' and updated_at timestamp is newer than created_at
 */
export async function test_api_post_vote_retrieve_after_update(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate a member
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string,
      password: typia.random<
        string & tags.Format<"password">
      >() satisfies string as string,
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string,
      ip: typia.random<
        string & tags.Format<"ipv4">
      >() satisfies string as string,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create a text post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        },
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Cast initial downvote on the post
  const downvote =
    await generate_random_community_platform_member_posts_votes_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          type: "down",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(downvote);
  // 6. Retrieve the vote
  const retrievedDownvote =
    await api.functional.communityPlatform.member.posts.votes.at(
      memberConnection,
      {
        postId: post.id,
        voteId: downvote.id,
      },
    );
  typia.assert(retrievedDownvote);
  // 7. Validate the vote type is 'down' and created_at equals updated_at (initial vote)
  TestValidator.equals(
    "vote type should be down",
    retrievedDownvote.type,
    "down",
  );
  TestValidator.equals(
    "created_at should equal updated_at for initial vote",
    retrievedDownvote.created_at,
    retrievedDownvote.updated_at,
  );
  // 8. Update vote to upvote
  const upvote =
    await generate_random_community_platform_member_posts_votes_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          type: "up",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(upvote);
  // 9. Retrieve the vote again
  const retrievedUpvote =
    await api.functional.communityPlatform.member.posts.votes.at(
      memberConnection,
      {
        postId: post.id,
        voteId: downvote.id,
      },
    );
  typia.assert(retrievedUpvote);
  // 10. Validate vote type changed to 'up' and updated_at timestamp is newer than created_at
  TestValidator.equals(
    "vote type should be up after update",
    retrievedUpvote.type,
    "up",
  );
  TestValidator.notEquals(
    "updated_at should be newer than created_at after vote change",
    retrievedUpvote.created_at,
    retrievedUpvote.updated_at,
  );
  TestValidator.predicate(
    "updated_at should be after created_at",
    new Date(retrievedUpvote.updated_at) > new Date(retrievedUpvote.created_at),
  );
  // Additional validation
  TestValidator.equals(
    "vote ID should remain the same",
    retrievedDownvote.id,
    retrievedUpvote.id,
  );
  TestValidator.equals(
    "post ID should match",
    retrievedUpvote.post.id,
    post.id,
  );
  TestValidator.equals(
    "member ID should match",
    retrievedUpvote.member.id,
    memberAuth.id,
  );
}
