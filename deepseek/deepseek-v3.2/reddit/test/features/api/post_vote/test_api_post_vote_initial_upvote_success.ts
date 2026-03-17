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

export async function test_api_post_vote_initial_upvote_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
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
  TestValidator.equals("subscription is active", subscription.active, true);
  // 4. Create post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.content({ paragraphs: 2 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Verify post author is the member
  TestValidator.equals("post author matches member", post.author.id, member.id);
  // 5. Validate initial karma score
  const initialKarma = member.karma;
  TestValidator.predicate(
    "initial karma is number",
    typeof initialKarma === "number",
  );
  // 6. Perform initial upvote
  const firstVote =
    await generate_random_community_platform_member_posts_votes_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          type: "up",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(firstVote);
  // 7. Validate vote type
  TestValidator.equals("vote type is upvote", firstVote.type, "up");
  // 8. Verify vote references
  TestValidator.equals("vote member matches", firstVote.member.id, member.id);
  TestValidator.equals("vote post matches", firstVote.post.id, post.id);
  // 9. Test karma increase by creating a post from a different author
  // Create another member to be the post author
  const authorMemberConnection: api.IConnection = { host: connection.host };
  const authorMember = await authorize_member_join(authorMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorMember);
  // Author member subscribes to the community
  await generate_random_community_platform_member_subscriptions_create(
    authorMemberConnection,
    {
      body: {
        community_id: community.id,
        active: true,
      } satisfies ICommunityPlatformSubscription.ICreate,
    },
  );
  // Author member creates a post
  const authorPost =
    await generate_random_community_platform_member_posts_create(
      authorMemberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          community_name: community.name,
          content_type: "TEXT",
          content_text: {
            content: RandomGenerator.content({ paragraphs: 2 }),
            formatting: "plain",
          } satisfies ICommunityPlatformPostText.ICreate,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(authorPost);
  TestValidator.equals(
    "author post author matches",
    authorPost.author.id,
    authorMember.id,
  );
  // Original member upvotes author's post
  const authorVote =
    await generate_random_community_platform_member_posts_votes_create(
      memberConnection,
      {
        params: { postId: authorPost.id },
        body: {
          type: "up",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(authorVote);
  TestValidator.equals("author vote type is upvote", authorVote.type, "up");
  // 10. Test idempotent behavior - same upvote again
  const sameVote =
    await generate_random_community_platform_member_posts_votes_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          type: "up",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(sameVote);
  TestValidator.equals("idempotent: same vote id", sameVote.id, firstVote.id);
  // 11. Test vote update: change from upvote to downvote
  const updatedVote =
    await generate_random_community_platform_member_posts_votes_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          type: "down",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(updatedVote);
  TestValidator.equals(
    "updated vote type is downvote",
    updatedVote.type,
    "down",
  );
  TestValidator.equals(
    "same vote id after update",
    updatedVote.id,
    firstVote.id,
  );
  // 12. Test vote removal by sending null vote type
  const removedVote =
    await generate_random_community_platform_member_posts_votes_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          type: null,
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
}